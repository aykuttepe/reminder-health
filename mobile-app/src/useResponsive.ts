import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  isSmallScreen: boolean;
  contentMaxWidth: number | undefined;
  tabBarMaxWidth: number | undefined;
  modalMaxWidth: number | undefined;
  carouselCardWidth: number;
  cardColumns: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  // Tablet definition: physical smallest width >= 600 or current width >= 768
  const isTablet = Math.min(width, height) >= 600 || width >= 768;
  const isLandscape = width > height;
  const isSmallScreen = width < 380;

  // On tablets, constrain the content well to prevent awkward stretching
  const contentMaxWidth = isTablet ? Math.min(Math.round(width - 48), 840) : undefined;
  const tabBarMaxWidth = isTablet ? 600 : undefined;
  const modalMaxWidth = isTablet ? 600 : undefined;

  // Carousel card sizing:
  // On phone: 80% of width (~300-340px)
  // On tablet: capped at 380px so it remains proportionate and peeks the next card
  const carouselCardWidth = isTablet
    ? Math.min(Math.round(width * 0.42), 380)
    : Math.round(width * 0.80);

  const cardColumns = isTablet ? 2 : 1;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    isSmallScreen,
    contentMaxWidth,
    tabBarMaxWidth,
    modalMaxWidth,
    carouselCardWidth,
    cardColumns,
  };
}
