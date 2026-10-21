import { onBeforeUnmount, onMounted, ref } from "vue";

export function useHeroParallax() {
  const heroElement = ref(null);
  let finePointer;
  let reducedMotion;
  let enabled = false;
  let bounds;
  let frameId = 0;
  let previousTime = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  function writePosition() {
    heroElement.value?.style.setProperty("--hero-x", currentX.toFixed(4));
    heroElement.value?.style.setProperty("--hero-y", currentY.toFixed(4));
  }

  function animate(time) {
    frameId = 0;
    const elapsed = previousTime ? Math.min(time - previousTime, 32) : 16;
    previousTime = time;
    const easing = 1 - Math.exp(-elapsed / 75);
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;
    const settled = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) < 0.001;
    if (settled) {
      currentX = targetX;
      currentY = targetY;
    }
    writePosition();
    if (!settled) frameId = requestAnimationFrame(animate);
    else heroElement.value?.classList.remove("is-depth-moving");
  }

  function scheduleFrame() {
    if (frameId) return;
    previousTime = 0;
    heroElement.value?.classList.add("is-depth-moving");
    frameId = requestAnimationFrame(animate);
  }

  function handleHeroPointer(event) {
    if (!enabled || event.pointerType !== "mouse" || document.hidden) return;
    bounds ||= heroElement.value?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    scheduleFrame();
  }

  function resetHeroPointer() {
    bounds = null;
    targetX = 0;
    targetY = 0;
    if (enabled && (currentX || currentY || frameId)) scheduleFrame();
  }

  function stopHeroMotion() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
    currentX = currentY = targetX = targetY = 0;
    bounds = null;
    writePosition();
    heroElement.value?.classList.remove("is-depth-moving");
  }

  function syncPreference() {
    stopHeroMotion();
    enabled = finePointer.matches && !reducedMotion.matches;
    heroElement.value?.classList.toggle("has-depth-motion", enabled);
  }

  function onVisibilityChange() {
    if (document.hidden) stopHeroMotion();
  }

  onMounted(() => {
    finePointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 781px)");
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    finePointer.addEventListener("change", syncPreference);
    reducedMotion.addEventListener("change", syncPreference);
    window.addEventListener("resize", stopHeroMotion, { passive: true });
    window.addEventListener("scroll", stopHeroMotion, { passive: true });
    window.addEventListener("blur", stopHeroMotion);
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncPreference();
  });

  onBeforeUnmount(() => {
    stopHeroMotion();
    finePointer?.removeEventListener("change", syncPreference);
    reducedMotion?.removeEventListener("change", syncPreference);
    window.removeEventListener("resize", stopHeroMotion);
    window.removeEventListener("scroll", stopHeroMotion);
    window.removeEventListener("blur", stopHeroMotion);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  return { heroElement, handleHeroPointer, resetHeroPointer, stopHeroMotion };
}
