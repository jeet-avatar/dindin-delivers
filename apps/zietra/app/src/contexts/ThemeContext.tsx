import React, { createContext, useContext, useState, useEffect } from 'react';
import brandColors from '../config/brandColors';

/**
 * Theme Context - Provides dynamic theme loaded from database
 * This replaces ALL hardcoded colors in the application
 */

interface ThemeGradients {
  brand: {
    primary: { gradient: string; hover: string; shadow: string };
    secondary: { gradient: string; hover: string; shadow: string };
  };
  semantic: {
    success: { gradient: string; hover: string; shadow: string };
    warning: { gradient: string; hover: string; shadow: string };
    danger: { gradient: string; hover: string; shadow: string };
    info: { gradient: string; hover: string; shadow: string };
    premium: { gradient: string; hover: string; shadow: string };
  };
  pages: {
    settings: {
      profile: { gradient: string; shadow: string };
      account: { gradient: string; shadow: string };
      notifications: { gradient: string; shadow: string };
      security: { gradient: string; shadow: string };
      preferences: { gradient: string; shadow: string };
      billing: { gradient: string; shadow: string };
    };
    dashboard: {
      deals: { gradient: string };
      contacts: { gradient: string };
      companies: { gradient: string };
      activities: { gradient: string };
    };
    campaigns: {
      sent: { gradient: string; lightBg: string };
      opened: { gradient: string; lightBg: string };
      clicked: { gradient: string; lightBg: string };
      bounced: { gradient: string; lightBg: string };
    };
    pricing: {
      free: { gradient: string; hover: string };
      starter: { gradient: string; hover: string; shadow: string };
      professional: { gradient: string; hover: string; shadow: string };
      enterprise: { gradient: string; hover: string; shadow: string };
    };
  };
}

interface ThemeConfig {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  gradients?: ThemeGradients;
  fontFamily?: string;
  fontSize?: string;
}

interface ThemeContextType {
  theme: ThemeConfig | null;
  gradients: ThemeGradients;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [gradients, setGradients] = useState<ThemeGradients>(getDefaultGradients());
  const [isLoading, setIsLoading] = useState(true);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/ui-config/active`);

      if (!response.ok) {
        console.warn('Failed to load theme from API, using defaults');
        setGradients(getDefaultGradients());
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Extract gradients from theme.buttonStyles if available
      if (data.theme?.buttonStyles?.gradients) {
        // DEEP MERGE: Combine database gradients with defaults to avoid missing sections
        const defaultGradients = getDefaultGradients();
        const dbGradients = data.theme.buttonStyles.gradients;

        const mergedGradients = {
          brand: dbGradients.brand || defaultGradients.brand,
          semantic: dbGradients.semantic || defaultGradients.semantic,
          pages: {
            settings: dbGradients.pages?.settings || defaultGradients.pages.settings,
            dashboard: dbGradients.pages?.dashboard || defaultGradients.pages.dashboard,
            campaigns: dbGradients.pages?.campaigns || defaultGradients.pages.campaigns,
            pricing: dbGradients.pages?.pricing || defaultGradients.pages.pricing,
          }
        };

        setGradients(mergedGradients as ThemeGradients);
        setTheme(data.theme);
      } else {
        // Use default gradients from brandColors.ts
        console.log('No custom gradients found, using defaults');
        setGradients(getDefaultGradients());
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setGradients(getDefaultGradients());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, gradients, isLoading, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper to get default gradients from brandColors.ts
function getDefaultGradients(): ThemeGradients {
  return {
    brand: {
      primary: {
        gradient: brandColors.brand.primary.gradient,
        hover: brandColors.brand.primary.hover,
        shadow: brandColors.brand.primary.shadow,
      },
      secondary: {
        gradient: brandColors.brand.secondary.gradient,
        hover: brandColors.brand.secondary.hover,
        shadow: brandColors.brand.secondary.shadow,
      },
    },
    semantic: {
      success: {
        gradient: brandColors.semantic.success.gradient,
        hover: brandColors.semantic.success.hover,
        shadow: brandColors.semantic.success.shadow,
      },
      warning: {
        gradient: brandColors.semantic.warning.gradient,
        hover: brandColors.semantic.warning.hover,
        shadow: brandColors.semantic.warning.shadow,
      },
      danger: {
        gradient: brandColors.semantic.danger.gradient,
        hover: brandColors.semantic.danger.hover,
        shadow: brandColors.semantic.danger.shadow,
      },
      info: {
        gradient: brandColors.semantic.info.gradient,
        hover: brandColors.semantic.info.hover,
        shadow: brandColors.semantic.info.shadow,
      },
      premium: {
        gradient: brandColors.semantic.premium.gradient,
        hover: brandColors.semantic.premium.hover,
        shadow: brandColors.semantic.premium.shadow,
      },
    },
    pages: {
      settings: {
        profile: {
          gradient: brandColors.page.settings.profile.gradient,
          shadow: brandColors.page.settings.profile.shadow,
        },
        account: {
          gradient: brandColors.page.settings.account.gradient,
          shadow: brandColors.page.settings.account.shadow,
        },
        notifications: {
          gradient: brandColors.page.settings.notifications.gradient,
          shadow: brandColors.page.settings.notifications.shadow,
        },
        security: {
          gradient: brandColors.page.settings.security.gradient,
          shadow: brandColors.page.settings.security.shadow,
        },
        preferences: {
          gradient: brandColors.page.settings.preferences.gradient,
          shadow: brandColors.page.settings.preferences.shadow,
        },
        billing: {
          gradient: brandColors.page.settings.billing.gradient,
          shadow: brandColors.page.settings.billing.shadow,
        },
      },
      dashboard: {
        deals: { gradient: brandColors.page.dashboard.deals.gradient },
        contacts: { gradient: brandColors.page.dashboard.contacts.gradient },
        companies: { gradient: brandColors.page.dashboard.companies.gradient },
        activities: { gradient: brandColors.page.dashboard.activities.gradient },
      },
      campaigns: {
        sent: {
          gradient: brandColors.page.campaigns.sent.gradient,
          lightBg: brandColors.page.campaigns.sent.lightBg,
        },
        opened: {
          gradient: brandColors.page.campaigns.opened.gradient,
          lightBg: brandColors.page.campaigns.opened.lightBg,
        },
        clicked: {
          gradient: brandColors.page.campaigns.clicked.gradient,
          lightBg: brandColors.page.campaigns.clicked.lightBg,
        },
        bounced: {
          gradient: brandColors.page.campaigns.bounced.gradient,
          lightBg: brandColors.page.campaigns.bounced.lightBg,
        },
      },
      pricing: {
        free: {
          gradient: brandColors.page.pricing.free.gradient,
          hover: brandColors.page.pricing.free.hover,
        },
        starter: {
          gradient: brandColors.page.pricing.starter.gradient,
          hover: brandColors.page.pricing.starter.hover,
          shadow: brandColors.page.pricing.starter.shadow,
        },
        professional: {
          gradient: brandColors.page.pricing.professional.gradient,
          hover: brandColors.page.pricing.professional.hover,
          shadow: brandColors.page.pricing.professional.shadow,
        },
        enterprise: {
          gradient: brandColors.page.pricing.enterprise.gradient,
          hover: brandColors.page.pricing.enterprise.hover,
          shadow: brandColors.page.pricing.enterprise.shadow,
        },
      },
    },
  };
}
