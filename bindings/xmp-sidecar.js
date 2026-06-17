// XMP sidecar build/parse for the develop module (Node-only, server-node).
//
// Real-world context: the library is full of darktable sidecars (written via
// Exiv2) that carry GPS, capture date, rating, and keywords (dc:subject,
// lr:hierarchicalSubject) plus darktable's own develop history. So we MUST NOT
// clobber an existing sidecar — we merge our data into it.
//
// XMP is a universal *metadata* container, but develop/edit settings inside it
// are app-specific and NOT portable between editors (Lightroom uses crs:,
// darktable uses darktable:history, Capture One doesn't use XMP for edits at
// all). Until we emit darktable:history (deferred), our develop stack lives as
// JSON under a private cstudio: namespace for a lossless round-trip back into
// this editor. Everything the existing sidecar already had is preserved.

const CSTUDIO_NS = 'https://aicaptionstudio.app/ns/develop/1.0/';
const SCHEMA_VERSION = '1';

function esc(v) {
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function unesc(v) {
    return String(v)
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}

// Decimal degrees -> XMP exif GPS form "DDD,MM.mmmmR" (R = N/S/E/W), matching
// the form darktable/Exiv2 already write.
function gpsCoord(value, isLat) {
    if (value == null || Number.isNaN(value)) return null;
    const ref = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg},${min.toFixed(6)}${ref}`;
}

// Our private attributes, ready to splice into an <rdf:Description> open tag.
function cstudioAttrs(adjustments) {
    const adjJson = JSON.stringify(adjustments || {});
    return `\n    xmlns:cstudio="${CSTUDIO_NS}"` +
        `\n    cstudio:version="${SCHEMA_VERSION}"` +
        `\n    cstudio:adjustments="${esc(adjJson)}"`;
}

// Merge our develop stack into an existing sidecar, preserving everything the
// other software (darktable etc.) wrote. Returns the merged XML, or null if the
// input doesn't look like an XMP packet we can splice into.
export function injectXmp(existingXml, adjustments) {
    if (!existingXml) return null;
    const open = existingXml.indexOf('<rdf:Description');
    if (open < 0) return null;
    const close = existingXml.indexOf('>', open);
    if (close < 0) return null;
    // Don't slice off a self-closing slash if the Description has no children.
    const tagEnd = existingXml[close - 1] === '/' ? close - 1 : close;

    let tag = existingXml.slice(open, tagEnd)
        .replace(/\s+xmlns:cstudio="[^"]*"/g, '')
        .replace(/\s+cstudio:version="[^"]*"/g, '')
        .replace(/\s+cstudio:adjustments="[^"]*"/g, '');
    tag += cstudioAttrs(adjustments);

    return existingXml.slice(0, open) + tag + existingXml.slice(tagEnd);
}

// Build a fresh sidecar from scratch (no existing file). Includes best-effort
// portable metadata from the indexed row so other catalog apps see something.
function buildFreshXmp(adjustments, meta = {}) {
    const attrs = [];
    if (meta.rating != null && meta.rating > 0) attrs.push(`xmp:Rating="${esc(meta.rating)}"`);
    if (meta.make) attrs.push(`tiff:Make="${esc(meta.make)}"`);
    if (meta.model) attrs.push(`tiff:Model="${esc(meta.model)}"`);
    if (meta.lens) attrs.push(`aux:Lens="${esc(meta.lens)}"`);
    if (meta.dateTime) attrs.push(`exif:DateTimeOriginal="${esc(meta.dateTime)}"`);
    const lat = gpsCoord(meta.lat, true);
    const lon = gpsCoord(meta.lon, false);
    if (lat) attrs.push(`exif:GPSLatitude="${esc(lat)}"`);
    if (lon) attrs.push(`exif:GPSLongitude="${esc(lon)}"`);
    const metaBlock = attrs.map((a) => '\n    ' + a).join('');

    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="AI Caption Studio">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:aux="http://ns.adobe.com/exif/1.0/aux/"${metaBlock}${cstudioAttrs(adjustments)}>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`;
}

// Build the sidecar to write. If `existingXml` is given (the current sidecar on
// disk), merge into it so nothing the other software wrote is lost; otherwise
// create a fresh packet.
export function buildXmp(adjustments, meta = {}, existingXml = null) {
    if (existingXml) {
        const merged = injectXmp(existingXml, adjustments);
        if (merged) return merged;
    }
    return buildFreshXmp(adjustments, meta);
}

// Parse our develop adjustments out of an XMP packet. Returns the adjustments
// object, or null if this sidecar has none of ours (e.g. an untouched darktable
// import).
export function parseXmp(xml) {
    if (!xml) return null;
    const m = xml.match(/cstudio:adjustments="([^"]*)"/);
    if (!m) return null;
    try {
        return JSON.parse(unesc(m[1]));
    } catch {
        return null;
    }
}
