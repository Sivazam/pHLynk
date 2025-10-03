'use client';

import { useEffect } from 'react';
import Head from 'next/head';

export type StatusBarTheme = 'blue' | 'white' | 'black';

interface StatusBarColorProps {
  theme: StatusBarTheme;
}

export function StatusBarColor({ theme }: StatusBarColorProps) {
  // Define status bar colors for each theme
  const statusBarColors = {
    blue: {
      light: '#20439f',  // PharmaLync blue
      dark: '#20439f'   // Same blue for both modes
    },
    white: {
      light: '#ffffff',  // White for light mode
      dark: '#ffffff'   // White for dark mode (as requested)
    },
    black: {
      light: '#000000',  // Black for light mode
      dark: '#000000'   // Black for dark mode
    }
  };

  const colors = statusBarColors[theme];

  // Effect to dynamically update meta tags for maximum precedence
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Remove existing theme-color meta tags
      const existingMetaTags = document.querySelectorAll('meta[name="theme-color"]');
      existingMetaTags.forEach(tag => tag.remove());

      // Remove existing msapplication-TileColor meta tags
      const existingTileTags = document.querySelectorAll('meta[name="msapplication-TileColor"]');
      existingTileTags.forEach(tag => tag.remove());

      // Create and append new theme-color meta tags for light mode
      const lightMetaTag = document.createElement('meta');
      lightMetaTag.name = 'theme-color';
      lightMetaTag.content = colors.light;
      lightMetaTag.setAttribute('media', '(prefers-color-scheme: light)');
      document.head.appendChild(lightMetaTag);

      // Create and append new theme-color meta tags for dark mode
      const darkMetaTag = document.createElement('meta');
      darkMetaTag.name = 'theme-color';
      darkMetaTag.content = colors.dark;
      darkMetaTag.setAttribute('media', '(prefers-color-scheme: dark)');
      document.head.appendChild(darkMetaTag);

      // Create and append msapplication-TileColor meta tag
      const tileMetaTag = document.createElement('meta');
      tileMetaTag.name = 'msapplication-TileColor';
      tileMetaTag.content = colors.light;
      document.head.appendChild(tileMetaTag);

      // For mobile Safari - update apple-mobile-web-app-status-bar-style
      const existingAppleTags = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
      existingAppleTags.forEach(tag => tag.remove());

      const appleMetaTag = document.createElement('meta');
      appleMetaTag.name = 'apple-mobile-web-app-status-bar-style';
      appleMetaTag.content = theme === 'blue' ? 'black-translucent' : 'default';
      document.head.appendChild(appleMetaTag);

      // Cleanup function to remove our tags when component unmounts
      return () => {
        lightMetaTag.remove();
        darkMetaTag.remove();
        tileMetaTag.remove();
        appleMetaTag.remove();
      };
    }
  }, [theme, colors]);

  return (
    <Head>
      {/* Static meta tags as fallback */}
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content={colors.light}
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content={colors.dark}
      />
      {/* Additional meta tags for better mobile browser support */}
      <meta
        name="msapplication-TileColor"
        content={colors.light}
      />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content={theme === 'blue' ? 'black-translucent' : 'default'}
      />
      {/* Force immediate application */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Force update meta tags immediately
              const updateMetaTags = function() {
                const lightColor = '${colors.light}';
                const darkColor = '${colors.dark}';
                
                // Update all theme-color meta tags
                document.querySelectorAll('meta[name="theme-color"]').forEach(tag => {
                  const media = tag.getAttribute('media');
                  if (media && media.includes('light')) {
                    tag.content = lightColor;
                  } else if (media && media.includes('dark')) {
                    tag.content = darkColor;
                  } else {
                    // Default to light color if no media specified
                    tag.content = lightColor;
                  }
                });
                
                // Update msapplication-TileColor
                document.querySelectorAll('meta[name="msapplication-TileColor"]').forEach(tag => {
                  tag.content = lightColor;
                });
                
                // Update apple-mobile-web-app-status-bar-style
                document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]').forEach(tag => {
                  tag.content = '${theme === 'blue' ? 'black-translucent' : 'default'}';
                });
              };
              
              // Run immediately
              updateMetaTags();
              
              // Run again after a short delay to ensure it takes precedence
              setTimeout(updateMetaTags, 100);
              
              // Run again after DOM is loaded
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', updateMetaTags);
              }
            })();
          `
        }}
      />
    </Head>
  );
}