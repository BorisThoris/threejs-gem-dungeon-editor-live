import React from "react";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import type { BreakingOptions } from "../hooks/useBreaking";
import * as THREE from "three";

interface BreakableComponentProps {
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

interface GlobalBreakableWrapperProps {
  children: React.ReactNode;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
  // Override global breaking for this specific component
  forceEnabled?: boolean;
  forceDisabled?: boolean;
}

const GlobalBreakableWrapper: React.FC<GlobalBreakableWrapperProps> = ({
  children,
  breakingOptions = {},
  onBreak,
  onFragmentClick,
  showHoverEffect = true,
  hoverColor = "#ff6b6b",
  forceEnabled = false,
  forceDisabled = false,
}) => {
  const { globalBreakingEnabled } = useConsolidatedGameStore();

  // Determine if breaking should be enabled for this component
  const isBreakingEnabled = forceDisabled
    ? false
    : forceEnabled || globalBreakingEnabled;

  // Clone children and add breaking props
  const childrenWithBreaking = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Check if the child is a breakable component by looking for the 'enabled' prop
      if (
        typeof child.props === "object" &&
        child.props !== null &&
        "enabled" in child.props
      ) {
        const childProps = child.props as BreakableComponentProps;
        return React.cloneElement(
          child as React.ReactElement<BreakableComponentProps>,
          {
            enabled: isBreakingEnabled,
            breakingOptions: {
              ...breakingOptions,
              ...(childProps.breakingOptions || {}),
            },
            onBreak: onBreak || childProps.onBreak,
            onFragmentClick: onFragmentClick || childProps.onFragmentClick,
            showHoverEffect: showHoverEffect,
            hoverColor: hoverColor,
          }
        );
      }
    }
    return child;
  });

  return <>{childrenWithBreaking}</>;
};

export default GlobalBreakableWrapper;
