export async function searchWeb(query: string): Promise<string> {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`);
    const data = await response.json();
    
    let results = '';
    
    if (data.AbstractText) {
      results += `${data.AbstractText}\n\n`;
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3)
        .filter((t: any) => t.Text)
        .map((t: any) => t.Text)
        .join('\n');
      if (topics) results += topics;
    }
    
    return results.trim() || '';
  } catch {
    return '';
  }
}

export async function getContextFromWeb(prompt: string): Promise<string> {
  const needsWebSearch = /что такое|кто такой|когда|где|последние новости|новый|тренд|актуальн|сейчас|2024|2025|2026/i.test(prompt);
  
  if (!needsWebSearch) return '';
  
  const searchQuery = prompt.slice(0, 100);
  const webData = await searchWeb(searchQuery);
  
  if (!webData) return '';
  
  return `[Web search results for context]: ${webData.slice(0, 500)}`;
}
