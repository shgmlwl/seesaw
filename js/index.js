// =============================
// DOM 준비 후 전체 실행
// =============================
document.addEventListener("DOMContentLoaded", function () {
  var baseW = 1920;
  var baseH = 1080;

  var layout = document.getElementById("layout");
  var seesawRot = document.getElementById("seesaw-rot");
  var shapeLayer = document.getElementById("shape-layer");

  if (!layout || !seesawRot || !shapeLayer || typeof gsap === "undefined") {
    console.warn("필수 엘리먼트 또는 GSAP를 찾지 못했습니다.");
    return;
  }

  // -----------------------------
  // 1920×1080 캔버스를 창 크기에 맞게 scale
  // -----------------------------
  function applyScale() {
    var scale = Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
    layout.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
  }
  applyScale();
  window.addEventListener("resize", applyScale);

  // ============================
  // 라벨 세트 (좌 / 우 전용)
  // ============================
  var leftLabels = ["브랜드", "인하우스", "리더", "회사"];
  var rightLabels = ["그래픽", "에이전시", "팀원", "창작자"];

  // ============================
  // 시소 / 도형 상태
  // ============================
  var shapesOnBar = []; // { el, side, weight, baseX, fixed, falling }
  var torque = 0; // 오른쪽 + / 왼쪽 -
  var dropStarted = false;

  gsap.set(seesawRot, { rotation: 0 });

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  // ----------------------------
  // 시소 각도 + 도형 슬라이드 업데이트
  // ----------------------------
  function updateSeesaw() {
    // 과한 흔들림 줄인 각도
    var targetAngle = clamp(torque, -3.5, 3.5) * 4.2;

    gsap.to(seesawRot, {
      rotation: targetAngle,
      duration: 1.35,
      ease: "elastic.out(1, 0.85)",
    });

    shapesOnBar.forEach(function (s) {
      if (s.falling) return;

      var angle = targetAngle;
      var dir = 0;

      if (angle > 0) dir = s.side === "right" ? 1 : -0.35;
      else if (angle < 0) dir = s.side === "left" ? -1 : 0.35;

      var slideAmount = Math.abs(angle) * 0.52 * dir;
      var newBaseX = s.baseX + slideAmount;

      // 중요한 고정(브랜드/그래픽)은 더 안 밀리게
      var limit = s.fixed ? 170 : 300;
      newBaseX = clamp(newBaseX, -limit, limit);

      s.baseX = newBaseX;

      gsap.to(s.el, {
        x: newBaseX,
        duration: 1.05,
        ease: "power2.out",
      });
    });
  }

  // ----------------------------
  // 특정 도형을 시소에서 제거 (떨어질 때)
  // ----------------------------
  function removeShapeFromTorque(shape) {
    var idx = shapesOnBar.indexOf(shape);
    if (idx !== -1) {
      shapesOnBar.splice(idx, 1);

      torque -= shape.side === "left" ? -shape.weight : shape.weight;
      torque = clamp(torque, -3.5, 3.5);
      updateSeesaw();
    }
  }

  function fallOff(shape) {
    if (shape.falling || shape.fixed) return;
    shape.falling = true;

    removeShapeFromTorque(shape);

    gsap.to(shape.el, {
      y: "+=260",
      rotation: shape.side === "left" ? -18 : 18,
      opacity: 0,
      duration: 0.95,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: function () {
        if (shape.el && shape.el.parentNode) {
          shape.el.parentNode.removeChild(shape.el);
        }
      },
    });
  }

  // ----------------------------
  // 도형을 시소 위에 등록
  // ----------------------------
  function registerShape(el, side, weight, fixed) {
    var currentX = gsap.getProperty(el, "x") || 0;

    var s = {
      el: el,
      side: side,
      weight: weight,
      baseX: currentX,
      fixed: !!fixed,
      falling: false,
    };

    shapesOnBar.push(s);

    torque += side === "left" ? -weight : weight;
    torque = clamp(torque, -3.5, 3.5);

    updateSeesaw();

    // 일정 개수 이상 쌓이면, 가장 오래된 (fixed 아닌) 것들부터 떨어뜨리기
    var MAX_SHAPES = 11;
    if (shapesOnBar.length > MAX_SHAPES) {
      for (var i = 0; i < shapesOnBar.length; i++) {
        var target = shapesOnBar[i];
        if (!target.fixed && !target.falling) {
          fallOff(target);
          break;
        }
      }
    }
  }

  // ----------------------------
  // 도형 하나 떨어뜨리기
  // ----------------------------
  function dropShape(opts) {
    var side = opts.side || "left";
    var size = opts.size || "small";
    var label = opts.label || "";
    var weight = typeof opts.weight === "number" ? opts.weight : 1;
    var fixed = !!opts.fixed;
    var shapeType = opts.shapeType || "square";

    // 위치(%) 계산
    var xPercent;
    if (fixed && label === "브랜드") {
      xPercent = 28;
    } else if (fixed && label === "그래픽") {
      xPercent = 72;
    } else {
      var rangeLeft = [6, 47];
      var rangeRight = [53, 94];
      xPercent =
        side === "left"
          ? gsap.utils.random(rangeLeft[0], rangeLeft[1])
          : gsap.utils.random(rangeRight[0], rangeRight[1]);
    }

    // 도형 element 생성
    var shape = document.createElement("div");
    shape.classList.add("shape", shapeType);
    shape.classList.add(size === "big" ? "big" : "small");

    // 크기 랜덤 (겹침 줄이기 위해 범위 살짝 정돈)
    if (size === "big") {
      var bigSize = gsap.utils.random(220, 260);
      shape.style.width = bigSize + "px";
      shape.style.height = bigSize + "px";
    } else {
      if (shapeType === "circle") {
        var cs = gsap.utils.random(70, 150);
        shape.style.width = cs + "px";
        shape.style.height = cs + "px";
      } else {
        var w = gsap.utils.random(70, 160);
        var h = gsap.utils.random(70, 160);
        shape.style.width = w + "px";
        shape.style.height = h + "px";
      }
    }

    shape.style.left = xPercent + "%";

    // 라벨
    if (label) {
      shape.classList.add("has-label");
      var span = document.createElement("span");
      span.classList.add("shape-label");
      span.textContent = label;
      shape.appendChild(span);
    }

    shapeLayer.appendChild(shape);

    // 낙하 애니메이션(정제된 회전)
    gsap.fromTo(
      shape,
      {
        y: -260,
        opacity: 0,
        rotation: gsap.utils.random(-8, 8),
      },
      {
        y: 0,
        opacity: 1,
        rotation: gsap.utils.random(-4, 4),
        duration: size === "big" ? 1.2 : 1.0,
        ease: "power2.in",
        overwrite: "auto",
        onStart: function () {
          // 낙하 충격(과하게 흔들리지 않게)
          var sign = side === "left" ? -1 : 1;
          gsap.to(seesawRot, {
            rotation: "+=" + sign * 1.2,
            duration: 0.55,
            ease: "power1.out",
            overwrite: "auto",
          });
        },
        onComplete: function () {
          // 착지 바운스
          gsap.to(shape, {
            y: -10,
            duration: 0.18,
            ease: "power1.out",
            yoyo: true,
            repeat: 1,
            overwrite: "auto",
            onComplete: function () {
              registerShape(shape, side, weight, fixed);
            },
          });
        },
      }
    );
  }

  // ----------------------------
  // 끝으로 밀려난 도형이 있는지 체크해서 떨어뜨리기
  // ----------------------------
  function checkEdgeFalls() {
    var layerRect = shapeLayer.getBoundingClientRect();

    shapesOnBar.forEach(function (s) {
      if (s.falling || s.fixed) return;

      var r = s.el.getBoundingClientRect();
      var padding = 10;

      if (
        r.right < layerRect.left + padding ||
        r.left > layerRect.right - padding
      ) {
        fallOff(s);
      }
    });
  }

  gsap.ticker.add(checkEdgeFalls);

  // ----------------------------
  // 랜덤 작은 도형 계속 떨어뜨리는 루프
  // ----------------------------
  function spawnRandomShape() {
    if (!dropStarted) return;

    var side = Math.random() < 0.5 ? "left" : "right";

    // 라벨은 일정 비율만(빈 도형 섞기)
    var label = "";
    if (Math.random() < 0.55) {
      label =
        side === "left"
          ? leftLabels[Math.floor(Math.random() * leftLabels.length)]
          : rightLabels[Math.floor(Math.random() * rightLabels.length)];
    }

    // 원형 비율(약 30%)
    var shapeType = Math.random() < 0.3 ? "circle" : "square";

    dropShape({
      side: side,
      size: "small",
      weight: gsap.utils.random(0.7, 1.35),
      fixed: false,
      label: label,
      shapeType: shapeType,
    });

    // 다음 도형 딜레이
    var delay = gsap.utils.random(0.9, 1.6);
    gsap.delayedCall(delay, spawnRandomShape);
  }

  // ----------------------------
  // 초기 시퀀스
  // ----------------------------
  function startScene() {
    shapesOnBar = [];
    torque = 0;
    gsap.set(seesawRot, { rotation: 0 });
    shapeLayer.innerHTML = "";
    dropStarted = false;

    // 1) 브랜드 (왼쪽, 고정)
    gsap.delayedCall(0.8, function () {
      dropShape({
        side: "left",
        size: "big",
        label: "브랜드",
        weight: 2.6,
        fixed: true,
        shapeType: "square",
      });
    });

    // 2) 그래픽 (오른쪽, 고정)
    gsap.delayedCall(1.8, function () {
      dropShape({
        side: "right",
        size: "big",
        label: "그래픽",
        weight: 2.6,
        fixed: true,
        shapeType: "square",
      });
    });

    // 3) 랜덤 루프 시작
    gsap.delayedCall(3.1, function () {
      dropStarted = true;
      spawnRandomShape();
    });
  }

  gsap.delayedCall(1.0, startScene);
});
