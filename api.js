const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function generateReadingContent(apiKey, level, topic) {
    let prompt = "";
    if (level.startsWith("logic")) {
        const difficulty = level.includes("easy") ? "early elementary school" : "late elementary school";
        prompt = `Act as a logic puzzle expert for kids. Generate a fun, text-based logic puzzle or brain teaser at a ${difficulty} difficulty level about '${topic || "a fun mystery"}'. The text must be 1 to 2 paragraphs setting up the puzzle or sequence. Following the text, generate exactly 4 multiple-choice questions testing their deductive reasoning or math logic. 

Output strictly valid JSON with this exact structure:
{
  "storyTitle": "Title of the Puzzle",
  "storyText": ["Paragraph 1", "Paragraph 2"],
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0
    }
  ]
}`;
    } else {
        prompt = `Act as an elementary school reading specialist. Generate a reading passage at Guided Reading Level '${level}' about '${topic || "a fun adventure"}'. The text must be exactly 5 short paragraphs. Following the text, generate exactly 4 multiple-choice questions testing comprehension. 

Output strictly valid JSON with this exact structure:
{
  "storyTitle": "Title of the story",
  "storyText": ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Paragraph 4", "Paragraph 5"],
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0
    }
  ]
}`;
    }

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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || "Failed to generate story from API.");
        }

        const data = await response.json();
        let jsonString = data.candidates[0].content.parts[0].text;
        
        // Strip out markdown code block if present
        jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
        
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}
