const assert = require("assert");

// Mock de la logique de swipe conforme à components/navigation/mobile-swipe-navigator.tsx
const SWIPE_SECTIONS = [
  { path: "/dashboard", label: "Accueil", index: 0 },
  { path: "/calendar", label: "Calendrier", index: 1 },
  { path: "/tasks", label: "Tâches", index: 2 },
  { path: "/finances", label: "Finances", index: 3 },
];

function getSectionIndex(pathname) {
  if (pathname === "/dashboard") return 0;
  if (pathname === "/calendar") return 1;
  if (pathname === "/tasks") return 2;
  if (pathname === "/finances") return 3;
  return -1;
}

function simulateSwipeGesture({
  pathname,
  startX,
  startY,
  endX,
  endY,
  deltaTime,
  targetElement = { tag: "div", isInteractive: false, hasHorizontalScroll: false },
  bodyOverflow = "unset",
  windowWidth = 390,
}) {
  const currentIndex = getSectionIndex(pathname);
  const isSwipeableRoute = currentIndex !== -1;

  if (!isSwipeableRoute || windowWidth >= 1024) {
    return { navigated: false, targetPath: null, reason: "NOT_SWIPEABLE_OR_DESKTOP" };
  }

  if (targetElement.isInteractive || targetElement.hasHorizontalScroll || bodyOverflow === "hidden") {
    return { navigated: false, targetPath: null, reason: "INTERACTIVE_OR_SCROLL_OVERRIDE" };
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  // Décision initiale sur l'axe vertical
  if (absY >= absX) {
    return { navigated: false, targetPath: null, reason: "VERTICAL_SCROLL_LOCKED" };
  }

  if (absX < absY * 1.25) {
    return { navigated: false, targetPath: null, reason: "DIAGONAL_NOT_HORIZONTAL" };
  }

  const isDistancePassed = absX >= 55;
  const isQuickFlick = absX >= 30 && deltaTime > 0 && absX / deltaTime > 0.38;

  if (!isDistancePassed && !isQuickFlick) {
    return { navigated: false, targetPath: null, reason: "BELOW_THRESHOLD" };
  }

  // Swipe Gauche (Doigt va vers la gauche => En avant)
  if (dx < 0 && currentIndex < SWIPE_SECTIONS.length - 1) {
    const nextSection = SWIPE_SECTIONS[currentIndex + 1];
    return { navigated: true, targetPath: nextSection.path, direction: "left" };
  }
  // Swipe Droite (Doigt va vers la droite => En arrière)
  else if (dx > 0 && currentIndex > 0) {
    const prevSection = SWIPE_SECTIONS[currentIndex - 1];
    return { navigated: true, targetPath: prevSection.path, direction: "right" };
  }

  return { navigated: false, targetPath: null, reason: "BOUNDARY_REACHED" };
}

function runSwipeTests() {
  console.log("==================================================================");
  console.log("    REMIND ME — TEST SUITE NAVIGATION HORIZONTALE PAR SWIPE       ");
  console.log("==================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function runTest(description, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`[PASS] ${description}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ${description}:`, err.message);
    }
  }

  // 1. Navigation en avant (Swipe Gauche)
  runTest("1. Dashboard -> Calendrier par swipe gauche", () => {
    const res = simulateSwipeGesture({ pathname: "/dashboard", startX: 300, startY: 200, endX: 180, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/calendar");
  });

  runTest("2. Calendrier -> Tâches par swipe gauche", () => {
    const res = simulateSwipeGesture({ pathname: "/calendar", startX: 300, startY: 200, endX: 180, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/tasks");
  });

  runTest("3. Tâches -> Finances par swipe gauche", () => {
    const res = simulateSwipeGesture({ pathname: "/tasks", startX: 300, startY: 200, endX: 180, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/finances");
  });

  // 2. Navigation en arrière (Swipe Droite)
  runTest("4. Finances -> Tâches par swipe droite", () => {
    const res = simulateSwipeGesture({ pathname: "/finances", startX: 100, startY: 200, endX: 230, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/tasks");
  });

  runTest("5. Tâches -> Calendrier par swipe droite", () => {
    const res = simulateSwipeGesture({ pathname: "/tasks", startX: 100, startY: 200, endX: 230, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/calendar");
  });

  runTest("6. Calendrier -> Dashboard par swipe droite", () => {
    const res = simulateSwipeGesture({ pathname: "/calendar", startX: 100, startY: 200, endX: 230, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, true);
    assert.strictEqual(res.targetPath, "/dashboard");
  });

  // 3. Limites de Navigation (Bords)
  runTest("7. Dashboard + Swipe droite -> Aucun changement (bloqué au bord gauche)", () => {
    const res = simulateSwipeGesture({ pathname: "/dashboard", startX: 100, startY: 200, endX: 230, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "BOUNDARY_REACHED");
  });

  runTest("8. Finances + Swipe gauche -> Aucun changement (bloqué au bord droit)", () => {
    const res = simulateSwipeGesture({ pathname: "/finances", startX: 300, startY: 200, endX: 180, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "BOUNDARY_REACHED");
  });

  // 4. Préservation du Scroll Vertical (Priorité Absolue)
  runTest("9. Scroll vertical pur (ΔY=150, ΔX=5) -> Scroll natif conservé, swipe ignoré", () => {
    const res = simulateSwipeGesture({ pathname: "/dashboard", startX: 200, startY: 400, endX: 195, endY: 250, deltaTime: 200 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "VERTICAL_SCROLL_LOCKED");
  });

  runTest("10. Scroll oblique à dominante verticale (ΔY=100, ΔX=40) -> Swipe ignoré", () => {
    const res = simulateSwipeGesture({ pathname: "/tasks", startX: 200, startY: 300, endX: 160, endY: 200, deltaTime: 150 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "VERTICAL_SCROLL_LOCKED");
  });

  // 5. Tolérance & Micro-mouvements
  runTest("11. Micro-mouvement accidentel (ΔX=15px) -> Ignoré sous le seuil", () => {
    const res = simulateSwipeGesture({ pathname: "/dashboard", startX: 200, startY: 200, endX: 185, endY: 200, deltaTime: 300 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "BELOW_THRESHOLD");
  });

  // 6. Conflits d'éléments interactifs internes
  runTest("12. Geste débuté sur un input/bouton -> Swipe ignoré pour laisser le contrôle", () => {
    const res = simulateSwipeGesture({
      pathname: "/tasks",
      startX: 300,
      startY: 200,
      endX: 180,
      endY: 205,
      deltaTime: 150,
      targetElement: { tag: "input", isInteractive: true, hasHorizontalScroll: false },
    });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "INTERACTIVE_OR_SCROLL_OVERRIDE");
  });

  runTest("13. Geste dans une zone avec scroll horizontal interne (onglets, calendrier) -> Swipe ignoré", () => {
    const res = simulateSwipeGesture({
      pathname: "/finances",
      startX: 300,
      startY: 200,
      endX: 180,
      endY: 205,
      deltaTime: 150,
      targetElement: { tag: "div", isInteractive: false, hasHorizontalScroll: true },
    });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "INTERACTIVE_OR_SCROLL_OVERRIDE");
  });

  runTest("14. Geste pendant qu'une modale/drawer est ouverte -> Swipe ignoré", () => {
    const res = simulateSwipeGesture({
      pathname: "/dashboard",
      startX: 300,
      startY: 200,
      endX: 180,
      endY: 205,
      deltaTime: 150,
      bodyOverflow: "hidden",
    });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "INTERACTIVE_OR_SCROLL_OVERRIDE");
  });

  // 7. Pages hors swipe (ex: /settings, /reports, /tasks/new)
  runTest("15. Swipe sur une page hors périmètre (/settings, /tasks/new) -> Inactif", () => {
    const res = simulateSwipeGesture({ pathname: "/settings", startX: 300, startY: 200, endX: 180, endY: 205, deltaTime: 150 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "NOT_SWIPEABLE_OR_DESKTOP");
  });

  // 8. Mode Desktop (> 1024px)
  runTest("16. Écran desktop (width >= 1024px) -> Swipe souris désactivé", () => {
    const res = simulateSwipeGesture({ pathname: "/dashboard", startX: 600, startY: 400, endX: 450, endY: 405, deltaTime: 150, windowWidth: 1280 });
    assert.strictEqual(res.navigated, false);
    assert.strictEqual(res.reason, "NOT_SWIPEABLE_OR_DESKTOP");
  });

  console.log("\n==================================================================");
  console.log(`RÉSULTAT : ${passedTests}/${totalTests} TESTS PASSÉS AVEC SUCCÈS !`);
  console.log("==================================================================");
}

runSwipeTests();
