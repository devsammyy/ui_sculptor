import { useCallback, useEffect, useRef, useState } from "react";
import { ViewportTarget } from "../core/domain/models/viewport-target";

/**
 * Viewport Coordinates Hook - Calculates normalized coordinates from mouse/touch events
 */
export interface UseViewportCoordinatesReturn {
  getNormalizedCoordinates: (
    event: React.MouseEvent | React.TouchEvent,
    containerRef: React.RefObject<HTMLElement>,
  ) => ViewportTarget | null;
  getCoordinatesFromEvent: (
    event: MouseEvent | TouchEvent,
    container: HTMLElement,
  ) => { x: number; y: number } | null;
}

export function useViewportCoordinates(): UseViewportCoordinatesReturn {
  const containerRef = useRef<HTMLElement | null>(null);

  const getCoordinatesFromEvent = useCallback(
    (
      event: MouseEvent | TouchEvent,
      container: HTMLElement,
    ): { x: number; y: number } | null => {
      const rect = container.getBoundingClientRect();

      let clientX: number;
      let clientY: number;

      if ("touches" in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ("changedTouches" in event && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else if ("clientX" in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return null;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Check if click is within container
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return null;
      }

      return { x, y };
    },
    [],
  );

  const getNormalizedCoordinates = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      containerRef: React.RefObject<HTMLElement>,
    ): ViewportTarget | null => {
      const container = containerRef.current;
      if (!container) return null;

      const nativeEvent = event.nativeEvent;
      const coords = getCoordinatesFromEvent(nativeEvent, container);
      if (!coords) return null;

      const rect = container.getBoundingClientRect();

      return {
        x: coords.x / rect.width,
        y: coords.y / rect.height,
        viewportWidth: rect.width,
        viewportHeight: rect.height,
        timestamp: Date.now(),
        source: "click",
      };
    },
    [getCoordinatesFromEvent],
  );

  return {
    getNormalizedCoordinates,
    getCoordinatesFromEvent,
  };
}

/**
 * Hook for tracking mouse position continuously (for hover effects)
 */
export function useMousePosition(containerRef: React.RefObject<HTMLElement>) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isInside, setIsInside] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setPosition({ x, y });
        setIsInside(true);
      } else {
        setIsInside(false);
      }
    };

    const handleMouseLeave = () => {
      setIsInside(false);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [containerRef]);

  return { position, isInside };
}

/**
 * Hook for getting element position relative to viewport
 */
export function useElementPosition(elementRef: React.RefObject<HTMLElement>) {
  const [position, setPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
      });
    };

    updatePosition();

    // Update on resize/scroll
    const observer = new ResizeObserver(updatePosition);
    observer.observe(element);

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [elementRef]);

  return position;
}
