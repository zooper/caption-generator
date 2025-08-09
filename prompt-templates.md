# Custom Prompt Templates for AI Caption Studio

## How Custom Prompts Work

Custom prompts automatically receive the same context as built-in styles:
- **Camera/Equipment**: Automatically detected from image metadata
- **Location**: GPS-based location if available
- **Weather**: Historical weather data for the photo date/location
- **User Context**: Any additional context you provide when generating

You can write simple, focused prompts without worrying about technical details!

## Template Examples

### 1. Travel Photography 🌍
```
Create a wanderlust-inspiring caption that:
- Captures the essence of the destination
- Includes travel emotions and experiences
- Uses adventure and exploration language
- Makes readers want to pack their bags

Generate 12-15 hashtags mixing:
- Destination-specific tags
- Travel and adventure hashtags
- Photography tags
- Weather/season appropriate tags
```

### 2. Food Photography 🍕
```
Create a mouth-watering caption for this food photo.

Caption should:
- Make readers crave the dish
- Use sensory language (taste, smell, texture)
- Be conversational and appetizing
- Include cooking/dining context if available

Hashtags should include:
- Food-specific tags
- Cooking method tags  
- Ingredient tags
- Foodie community hashtags
```

### 3. Pet Photography 🐕
```
Write a caption from the pet's perspective about this photo.

Caption style:
- Write as if the pet is speaking
- Use playful, innocent language
- Include pet personality traits
- Mention activities or mood shown

Generate hashtags for:
- Pet type and breed
- Pet activities
- Pet parent community
- Cute/funny pet tags
```

### 4. Fitness & Workout 💪
```
Create a motivational fitness caption for this workout photo.

Caption should:
- Inspire and motivate readers
- Celebrate progress and effort
- Include workout context if visible
- Use empowering language

Hashtags should cover:
- Fitness goals and motivation
- Workout type specific tags
- Body positivity tags
- Fitness community hashtags
```

### 5. Nature & Landscape 🌲
```
Write a nature-focused caption that connects readers with the natural world.

Caption approach:
- Highlight natural beauty and wonder
- Include environmental awareness if appropriate
- Use poetic, contemplative language

Generate hashtags for:
- Nature and landscape photography
- Environmental conservation
- Outdoor activities
- Location-specific nature tags
```

### 6. Business & Professional 💼
```
Create a professional caption suitable for business networking.

Caption requirements:
- Maintain professional tone
- Highlight expertise or industry insights
- Include relevant business context
- Keep it engaging but appropriate

Business hashtags should include:
- Industry-specific tags
- Professional networking tags
- Business growth hashtags
- Leadership and career tags
```

### 7. Fashion & Style 👗
```
Write a stylish caption that showcases fashion sense and personal style.

Style the caption to:
- Highlight outfit details and styling choices
- Express personal fashion philosophy
- Include style inspiration or mood
- Mention brands or styling tips if relevant

Fashion hashtags should cover:
- Style categories and trends
- Fashion inspiration tags
- Personal style hashtags
- Outfit detail tags
```

### 8. Behind the Scenes 🎬
```
Create a behind-the-scenes caption that gives followers an inside look.

Caption style:
- Share the story behind the photo
- Include process or preparation details
- Make it personal and authentic
- Reveal interesting details about the shoot/process

BTS hashtags should include:
- Behind the scenes tags
- Process and workflow tags
- Professional insight tags
- Industry-specific BTS tags
```

### 9. Swedish Language 🇸🇪
```
Skapa en bildtext på svenska för detta foto.

Bildtexten ska:
- Vara naturlig och autentisk på svenska
- Fånga bildens huvudämne och känsla
- Använda vardagligt svenskt språk
- Inkludera relevant kontext naturligt

Skapa 10-15 hashtags som blandar:
- Populära svenska hashtags
- Platsspecifika taggar
- Ämnesrelevanta taggar

VIKTIGT: Använd engelsk formattering för etiketter även om innehållet är på svenska.
```

## Usage Tips

1. **Automatic Context**: The system automatically provides camera, location, weather, and user context - no need to manually request these
2. **Simple Prompts**: Focus on style and tone rather than technical requirements
3. **Language Support**: Write prompts in any language - the system handles formatting automatically
4. **Optional Variables**: You can still use variables like `{location}` or `{weather}` if you want specific control, but it's not required
5. **Format Handling**: The system automatically handles proper output formatting (CAPTION:, HASHTAGS:, ALT_TEXT:)

## Best Practices

- Keep prompts focused on a specific style or theme
- Specify the desired tone and voice clearly
- Focus on what makes your style unique
- Test prompts with different types of images
- Keep prompt names under 50 characters
- Trust that technical context will be provided automatically