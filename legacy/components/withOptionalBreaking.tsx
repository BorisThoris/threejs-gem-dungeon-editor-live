import React from "react";
import OptionalBreakable from "./OptionalBreakable";
import type { BreakingOptions } from "../hooks/useBreaking";
import * as THREE from "three";

interface BreakingConfig {
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

/**
 * Higher-order component that adds optional breaking functionality to any component
 * @param WrappedComponent - The component to wrap
 * @param defaultConfig - Default breaking configuration
 * @returns Component with optional breaking functionality
 */
export function withOptionalBreaking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultConfig: BreakingConfig = {}
) {
  const ComponentWithBreaking = React.forwardRef<any, P & BreakingConfig>(
    (props, ref) => {
      const {
        enabled = false,
        breakingOptions = {},
        onBreak,
        onFragmentClick,
        showHoverEffect = true,
        hoverColor = "#ff6b6b",
        ...restProps
      } = { ...defaultConfig, ...props };

      return (
        <OptionalBreakable
          enabled={enabled}
          breakingOptions={breakingOptions}
          onBreak={onBreak}
          onFragmentClick={onFragmentClick}
          showHoverEffect={showHoverEffect}
          hoverColor={hoverColor}
        >
          <WrappedComponent {...(restProps as P)} ref={ref} />
        </OptionalBreakable>
      );
    }
  );

  ComponentWithBreaking.displayName = `withOptionalBreaking(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return ComponentWithBreaking;
}

export default withOptionalBreaking;
