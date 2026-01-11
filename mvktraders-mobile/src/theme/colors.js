export const lightTheme = {
    mode: 'light',

    // Backgrounds
    background: '#F8FAFC', // Slate-50: A very soft, clean off-white. Less harsh than #FFF, more premium than #F1F5F9.
    cardBg: '#FFFFFF',     // Pure white cards for crisp contrast against Slate-50.

    // Shadows & Borders
    // In light mode, prefer shadows over borders for depth.
    cardBorder: '#E2E8F0', // Slate-200: Very subtle border.
    shadowColor: '#64748B', // Slate-500 shadow for softness.

    // Typography
    textPrimary: '#0F172A', // Slate-900: Deep, almost black blue for readability.
    textSecondary: '#64748B', // Slate-500: Classic secondary text.
    headerText: '#1E293B',    // Slate-800: Strong header.

    // Brand Colors
    primary: '#4F46E5',   // Indigo-600: Vibrant but professional.
    secondary: '#7C3AED', // Violet-600: Good complement.

    // Functional Colors
    error: '#EF4444',     // Red-500
    success: '#10B981',   // Emerald-500
    warning: '#F59E0B',   // Amber-500

    // UI Elements
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1', // Slate-300
    overlay: 'rgba(15, 23, 42, 0.4)', // Darker overlay for focus on modal
    modalBg: '#FFFFFF',

    // Specific Accent Backgrounds (Backgrounds for badges/icons)
    // Using solid pale colors instead of opacity for cleaner look in light mode
    primaryBg: '#EEF2FF', // Indigo-50
    secondaryBg: '#F5F3FF', // Violet-50
    successBg: '#ECFDF5', // Emerald-50
    errorBg: '#FEF2F2',   // Red-50
    warningBg: '#FFFBEB', // Amber-50

    // Specific elements mappings
    cardData: '#FFFFFF',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '#E2E8F0',

    // Special: Dark Card in Light Mode (e.g. for Balance)
    // Often it's nice to have one dark element for contrast
    darkCardBg: '#1E293B',
    darkCardText: '#F8FAFC'
};

export const darkTheme = {
    mode: 'dark',

    // Backgrounds
    background: '#020617', // Slate-950: Deep, rich dark background.
    cardBg: '#1E293B', // Slate-800: Solid background for cards in dark mode.

    // Shadows & Borders
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000000',

    // Typography
    textPrimary: '#F8FAFC', // Slate-50
    textSecondary: '#94A3B8', // Slate-400
    headerText: '#F1F5F9',    // Slate-100

    // Brand Colors
    primary: '#6366F1',   // Indigo-500: Slightly lighter for dark mode visibility
    secondary: '#A855F7', // Purple-500

    // Functional Colors
    error: '#EF4444',
    success: '#10B981',
    warning: '#FBBF24',   // Amber-400

    // UI Elements
    inputBackground: 'rgba(15, 23, 42, 0.6)',
    inputBorder: 'rgba(148, 163, 184, 0.2)',
    overlay: 'rgba(0,0,0,0.7)',
    modalBg: '#1E293B',

    // Specific Accent Backgrounds (using opacity for glassmorphism feel in dark mode)
    primaryBg: 'rgba(99, 102, 241, 0.1)',
    secondaryBg: 'rgba(168, 85, 247, 0.1)',
    successBg: 'rgba(16, 185, 129, 0.1)',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    warningBg: 'rgba(251, 191, 36, 0.1)',

    // Specific elements mappings
    cardData: 'rgba(30, 41, 59, 0.8)',
    sidebarBg: '#0F172A',
    sidebarBorder: 'rgba(255,255,255,0.05)',

    // Special
    darkCardBg: 'rgba(30, 41, 59, 0.8)',
    darkCardText: '#F8FAFC'
};

export const colors = {
    ...darkTheme,
};
