import { useState } from "react";

export type AnimationState = "idle" | "hover" | "active" | "success" | "error";

export function useAnimationState(defaultState: AnimationState = "idle") {
  const [state, setState] = useState<AnimationState>(defaultState);
  
  const setHover = () => setState("hover");
  const setActive = () => setState("active");
  const setIdle = () => setState("idle");
  const setSuccess = () => setState("success");
  const setError = () => setState("error");
  
  return {
    state,
    setHover,
    setActive,
    setIdle,
    setSuccess,
    setError,
    isHover: state === "hover",
    isActive: state === "active",
    isIdle: state === "idle",
    isSuccess: state === "success",
    isError: state === "error"
  };
}

export function useButtonAnimation() {
  const animation = useAnimationState();
  
  const buttonProps = {
    onMouseEnter: animation.setHover,
    onMouseLeave: animation.setIdle,
    onMouseDown: animation.setActive,
    onMouseUp: animation.isActive ? animation.setHover : animation.setIdle,
    onFocus: animation.setHover,
    onBlur: animation.setIdle,
  };
  
  return {
    ...animation,
    buttonProps
  };
}