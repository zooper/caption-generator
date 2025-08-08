// Template rendering utilities for both frontend and backend
class TemplateRenderer {
    constructor() {
        this.templateCache = new Map();
    }

    // Load template from public/templates directory
    async loadTemplate(templateName) {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        try {
            const response = await fetch(`/templates/${templateName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${templateName}`);
            }
            const template = await response.text();
            this.templateCache.set(templateName, template);
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            throw error;
        }
    }

    // Render template with data substitution
    render(template, data = {}) {
        let result = template;
        
        // Replace all template variables
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            result = result.replaceAll(placeholder, value || '');
        }

        return result;
    }

    // Convenience methods for common templates
    async renderLoginEmail(loginUrl) {
        const template = await this.loadTemplate('login-email');
        return this.render(template, {
            LOGIN_URL: loginUrl,
            TIMESTAMP: new Date().toLocaleString()
        });
    }

    async renderInvitationEmail(inviterEmail, inviteUrl, personalMessageHtml = '', tierInfoHtml = '', tierLine = '') {
        const template = await this.loadTemplate('invitation-email');
        return this.render(template, {
            INVITER_EMAIL: inviterEmail,
            INVITE_URL: inviteUrl,
            PERSONAL_MESSAGE_HTML: personalMessageHtml,
            TIER_INFO_HTML: tierInfoHtml,
            TIMESTAMP: new Date().toLocaleString(),
            TIER_LINE: tierLine
        });
    }

    async renderInvitationReminderEmail(inviterEmail, inviteUrl, personalMessageHtml = '') {
        const template = await this.loadTemplate('invitation-reminder-email');
        return this.render(template, {
            INVITER_EMAIL: inviterEmail,
            INVITE_URL: inviteUrl,
            PERSONAL_MESSAGE_HTML: personalMessageHtml,
            TIMESTAMP: new Date().toLocaleString()
        });
    }

    async renderLoginSuccess(userEmail) {
        const template = await this.loadTemplate('login-success');
        return this.render(template, {
            USER_EMAIL: userEmail
        });
    }

    async renderLoginError(errorTitle, errorMessage) {
        const template = await this.loadTemplate('login-error');
        return this.render(template, {
            ERROR_TITLE: errorTitle,
            ERROR_MESSAGE: errorMessage
        });
    }

    async renderInvitationAccept(email, inviteToken, invitedByEmail, tierName) {
        const template = await this.loadTemplate('invitation-accept');
        return this.render(template, {
            EMAIL: email,
            INVITE_TOKEN: inviteToken,
            INVITED_BY_EMAIL: invitedByEmail,
            TIER_NAME: tierName
        });
    }

    async renderInvitationError(errorTitle, errorMessage) {
        const template = await this.loadTemplate('invitation-error');
        return this.render(template, {
            ERROR_TITLE: errorTitle,
            ERROR_MESSAGE: errorMessage
        });
    }

    async renderAdminMenu() {
        return await this.loadTemplate('admin-menu');
    }

    async renderUserControls(adminMenu, userEmail, userUsageDisplay) {
        const template = await this.loadTemplate('user-controls');
        return this.render(template, {
            ADMIN_MENU: adminMenu,
            USER_EMAIL: userEmail,
            USER_USAGE_DISPLAY: userUsageDisplay
        });
    }
}

// For environments that support ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TemplateRenderer };
}

// For browser/worker environments
if (typeof window !== 'undefined' || typeof globalThis !== 'undefined') {
    globalThis.TemplateRenderer = TemplateRenderer;
}