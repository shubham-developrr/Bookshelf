import React, { useState, useEffect } from 'react';

// Tab icons mapping - enhanced with better SVG icons from svg.html, theme-adaptive
const getTabIcon = (tabName: string) => {
  const iconMap: { [key: string]: JSX.Element } = {
    read: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
      </svg>
    ),
    highlights: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="m16 5-1.5-1.5a2.12 2.12 0 0 0-3 0L3 12.06V16h3.94L15.5 7.5a2.12 2.12 0 0 0 0-3Z"></path>
        <path d="m14.5 6.5 3 3"></path>
        <path d="M12 21v-2.5a2.5 2.5 0 0 1 2.5-2.5H17"></path>
        <path d="M21 15v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"></path>
      </svg>
    ),
    'add-tool': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    notes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M13.4 2H6.6C5.7 2 5 2.7 5 3.6v16.8c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6V7.6L13.4 2z"></path>
        <path d="M13 2v6h6"></path>
        <path d="M9 14h4"></path>
        <path d="M9 18h7"></path>
      </svg>
    ),
    qa: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <path d="M8 10h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M16 10h.01"></path>
      </svg>
    ),
    quiz: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    mcq: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    flashcard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    'flash-card': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    mindmap: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 12v-1"></path>
        <path d="M12 20v-1"></path>
        <path d="M12 4V3"></path>
        <path d="m5 10-.8-.4"></path>
        <path d="m5 18-.8-.4"></path>
        <path d="m19 10.4-.8-.4"></path>
        <path d="m19 18.4-.8-.4"></path>
      </svg>
    ),
    'mind-map': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
        <path d="M12 12v-1"></path>
        <path d="M12 20v-1"></path>
        <path d="M12 4V3"></path>
        <path d="m5 10-.8-.4"></path>
        <path d="m5 18-.8-.4"></path>
        <path d="m19 10.4-.8-.4"></path>
        <path d="m19 18.4-.8-.4"></path>
      </svg>
    ),
    summary: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    videos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    ),
    video: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    )
  };

  // Try to match tab name to icon with multiple variations
  const normalizedName = tabName.toLowerCase().replace(/[\s-_]/g, '');
  
  // Direct match
  if (iconMap[normalizedName]) return iconMap[normalizedName];
  
  // Partial matching for common patterns
  if (normalizedName.includes('quiz') || normalizedName.includes('mcq')) return iconMap.quiz;
  if (normalizedName.includes('flashcard') || normalizedName.includes('flash')) return iconMap.flashcard;
  if (normalizedName.includes('mindmap') || normalizedName.includes('mind')) return iconMap.mindmap;
  if (normalizedName.includes('note')) return iconMap.notes;
  if (normalizedName.includes('video')) return iconMap.video;
  if (normalizedName.includes('summary') || normalizedName.includes('summar')) return iconMap.summary;
  if (normalizedName.includes('qa') || normalizedName.includes('question')) return iconMap.qa;
  
  // Default fallback icon for custom tabs (general tab icon)
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
};

interface ResponsiveTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeTabs: string[];
  onDeleteTab?: (tab: string) => void;
  onRenameTab?: (oldName: string, newName: string) => void;
  getTabDisplayName: (tab: string) => string;
  showTemplateSelector: boolean;
  onToggleTemplateSelector: () => void;
  showRenameInput: string | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: (tab: string) => void;
  onHandleRename: (tab: string) => void;
}

export const ResponsiveTabBar: React.FC<ResponsiveTabBarProps> = ({
  activeTab,
  onTabChange,
  activeTabs,
  onDeleteTab,
  getTabDisplayName,
  showTemplateSelector,
  onToggleTemplateSelector,
  showRenameInput,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onHandleRename
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Reactive mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Core tabs that are always visible
  const coreTabs = ['read', 'highlights'];
  const dynamicTabs = activeTabs.filter(tab => !coreTabs.includes(tab));
  
  // Mobile: Always show all tab icons, dropdown for full names only
  const shouldShowIconsOnly = isMobile;
  const shouldShowNamesDropdown = isMobile && dynamicTabs.length > 0;

  // Handle rename functionality
  const handleRenameKeyPress = (e: React.KeyboardEvent, tab: string) => {
    if (e.key === 'Enter') {
      onHandleRename(tab);
    } else if (e.key === 'Escape') {
      onStartRename('');
      onRenameValueChange('');
    }
  };

  const handleRenameBlur = (tab: string) => {
    onHandleRename(tab);
  };
  
  return (
    <>
      {/* Main Tab Bar */}
      <div className="flex gap-2 overflow-x-auto">
        {/* Core Tabs - Always Visible */}
        <button 
          onClick={() => onTabChange('read')}
          className={`flex items-center gap-2 px-3 py-3 rounded-lg text-center font-medium transition-all touch-manipulation ${
            activeTab === 'read' 
              ? 'theme-accent text-white' 
              : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
          } ${shouldShowIconsOnly ? 'flex-shrink-0' : 'flex-1'}`}
          style={{ minHeight: '44px', minWidth: shouldShowIconsOnly ? '44px' : 'auto' }}
          title={shouldShowIconsOnly ? 'Read' : undefined}
        >
          {getTabIcon('read')}
          {!shouldShowIconsOnly && <span>Read</span>}
        </button>
        
        <button 
          onClick={() => onTabChange('highlights')}
          className={`flex items-center gap-2 px-3 py-3 rounded-lg text-center font-medium transition-all touch-manipulation ${
            activeTab === 'highlights' 
              ? 'theme-accent text-white' 
              : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
          } ${shouldShowIconsOnly ? 'flex-shrink-0' : 'flex-1'}`}
          style={{ minHeight: '44px', minWidth: shouldShowIconsOnly ? '44px' : 'auto' }}
          title={shouldShowIconsOnly ? 'Highlights' : undefined}
        >
          {getTabIcon('highlights')}
          {!shouldShowIconsOnly && <span>Highlights</span>}
        </button>
        
        {/* Dynamic Tabs - All Visible with Icons */}
        {dynamicTabs.map((tab) => (
          <div key={tab} className="relative flex-shrink-0">
            {showRenameInput === tab ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyPress={(e) => handleRenameKeyPress(e, tab)}
                onBlur={() => handleRenameBlur(tab)}
                className="w-full p-2 text-sm theme-surface2 border theme-border rounded-lg theme-text text-center min-w-[120px]"
                style={{ minHeight: '44px' }}
                autoFocus
              />
            ) : (
              <div
                onClick={() => onTabChange(tab)}
                onDoubleClick={() => onStartRename(tab)}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg transition-all group relative text-sm font-medium touch-manipulation cursor-pointer ${
                  activeTab === tab 
                    ? 'theme-accent text-white' 
                    : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                }`}
                style={{ minHeight: '44px', minWidth: shouldShowIconsOnly ? '44px' : 'auto' }}
                title={shouldShowIconsOnly ? getTabDisplayName(tab) : "Double-tap to rename, tap × to delete"}
              >
                {getTabIcon(tab)}
                {!shouldShowIconsOnly && (
                  <span className="block truncate pr-6">{getTabDisplayName(tab)}</span>
                )}
                {onDeleteTab && !shouldShowIconsOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTab(tab);
                    }}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 opacity-70 hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none touch-manipulation"
                    title="Delete tab"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        
        {/* Dropdown Toggle for Tab Names (Mobile Only) */}
        {shouldShowNamesDropdown && (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-3 py-3 rounded-lg theme-surface2 theme-text hover:theme-accent-bg hover:text-white transition-all flex-shrink-0"
            style={{ minHeight: '44px' }}
            title="Show tab names"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16"/>
            </svg>
          </button>
        )}
      </div>
      
      {/* Dropdown for Tab Names (Mobile Only) */}
      {shouldShowNamesDropdown && showDropdown && (
        <div className="mt-2 p-3 theme-surface2 rounded-lg border theme-border">
          <div className="text-sm font-semibold theme-text mb-2">Tab Actions:</div>
          <div className="grid grid-cols-1 gap-2">
            {dynamicTabs.map((tab) => (
              <div key={tab} className="flex items-center justify-between p-2 rounded theme-surface hover:theme-surface2">
                <span className="font-medium theme-text flex items-center gap-2">
                  {getTabIcon(tab)}
                  {getTabDisplayName(tab)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onStartRename(tab)}
                    className="text-xs px-2 py-1 rounded theme-accent text-white"
                    title="Rename"
                  >
                    Rename
                  </button>
                  {onDeleteTab && (
                    <button
                      onClick={() => onDeleteTab(tab)}
                      className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Add Template Button */}
      <div className="relative mt-2">
        <button
          onClick={onToggleTemplateSelector}
          className="w-full px-4 py-3 rounded-lg border-2 border-dashed theme-border hover:theme-accent-border transition-colors theme-text font-medium touch-manipulation flex items-center justify-center gap-2"
          style={{ minHeight: '44px' }}
        >
          {getTabIcon('add-tool')}
          <span>Add Learning Tool</span>
        </button>
      </div>
    </>
  );
};
