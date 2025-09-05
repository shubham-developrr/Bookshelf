const displayNames: { [key: string]: string } = {
    'read': 'Read',
    'highlights': 'Highlights',
    'notes': 'Notes',
    'flashcard': 'Flash Cards',
    'mcq': 'MCQ',
    'q&a': 'Q&A',
    'video': 'Videos',
    'videos': 'Videos',
    'mindmap': 'Mind Maps',
    'general': 'General'
};

export const getTabDisplayName = (
    tabName: string,
    customTabNames: { [key: string]: string } = {}
): string => {
    // Return custom name if exists
    if (customTabNames[tabName]) {
        return customTabNames[tabName];
    }

    // Handle numbered duplicates
    const baseMatch = tabName.match(/^([A-Z]+)_(\d+)$/i);
    if (baseMatch) {
        const [, baseId, number] = baseMatch;
        const baseName = displayNames[baseId.toLowerCase() as keyof typeof displayNames] || baseId;
        return `${baseName} ${number}`;
    }

    return displayNames[tabName.toLowerCase() as keyof typeof displayNames] || tabName;
};
