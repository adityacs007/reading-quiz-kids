const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function generateReadingContent(apiKey, level, topic) {
    const prompt = `Act as an elementary school reading specialist. Generate a reading passage at Guided Reading Level '${level}' about '${topic || "a fun adventure"}'. The text must be exactly 3 short paragraphs. Following the text, generate 3 multiple-choice questions testing comprehension.

Output strictly valid JSON with this exact structure:
{
  "storyTitle": "Title of the story",
  "storyText": ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0
    }
  ]
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to generate story from API.");
        }

        const data = await response.json();
        const jsonString = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
