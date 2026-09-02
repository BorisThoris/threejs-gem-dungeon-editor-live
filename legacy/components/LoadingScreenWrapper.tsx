import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";
import LoadingScreen from "./LoadingScreen";

const LoadingScreenWrapper: React.FC = () => {
  const { transition, isLoading, loadingProgress } = useRoomManagerStore();

  // Show loading screen during transitions or loading
  if (isLoading || transition?.isTransitioning) {
    const message = transition?.isTransitioning
      ? `Entering ${transition.direction} room...`
      : "Loading room...";

    return (
      <LoadingScreen
        isVisible={true}
        progress={transition?.transitionProgress || loadingProgress}
        message={message}
      />
    );
  }

  return null;
};

export default LoadingScreenWrapper;
