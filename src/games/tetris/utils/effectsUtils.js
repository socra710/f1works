// 화면 흔들림 효과
export const addScreenShake = () => {
  const mainElement = document.querySelector('.tetris-main');
  if (mainElement) {
    mainElement.classList.add('screen-shake');
    setTimeout(() => {
      mainElement.classList.remove('screen-shake');
    }, 500);
  }
};

// 피 오버레이 추가
export const addBloodOverlay = () => {
  const mainElement = document.querySelector('.tetris-main');
  if (!mainElement) return;

  const overlay = document.createElement('div');
  overlay.className = 'blood-overlay';
  mainElement.appendChild(overlay);

  const drips = ['drip1', 'drip2', 'drip3', 'drip4', 'drip5', 'drip6', 'drip7'];
  drips.forEach((cls) => {
    const drip = document.createElement('div');
    drip.className = `blood-drip ${cls}`;
    drip.style.top = '0';
    mainElement.appendChild(drip);
  });

  return () => {
    const existingOverlay = mainElement.querySelector('.blood-overlay');
    if (existingOverlay) existingOverlay.remove();
    document.querySelectorAll('.blood-drip').forEach((drip) => drip.remove());
  };
};

// 회색 라인 경고 효과
export const addGrayLineWarning = () => {
  const mainElement = document.querySelector('.tetris-main');
  if (mainElement) {
    mainElement.classList.add('gray-line-warning');
    setTimeout(() => {
      mainElement.classList.remove('gray-line-warning');
    }, 500);
  }
};

// 화면 좌표에서 피 파티클 렌더링
export const drawScreenBloodParticles = (particles) => {
  const screenParticles = particles.filter((p) => p.isScreenParticle);

  if (screenParticles.length === 0) return;

  let overlay = document.getElementById('blood-particle-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'blood-particle-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '999';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = '';

  screenParticles.forEach((p) => {
    const div = document.createElement('div');
    const opacity = p.life * p.opacity;

    div.style.position = 'fixed';
    div.style.left = p.x + 'px';
    div.style.top = p.y + 'px';
    div.style.width = p.size + 'px';
    div.style.height = p.size + 'px';
    div.style.borderRadius = '50%';
    div.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
    div.style.boxShadow = `0 0 ${p.size * 0.8}px rgba(255, 0, 0, ${
      opacity * 0.6
    })`;
    div.style.transform = 'translate(-50%, -50%)';
    div.style.pointerEvents = 'none';

    overlay.appendChild(div);
  });
};

// 피 튀김 파티클 생성
export const spawnBloodParticles = (canvasRef, linesClearedCount) => {
  const canvas = canvasRef.current;
  const container = canvas?.parentElement;
  if (!canvas || !container) return [];

  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const particleCount = linesClearedCount * 8;
  const newParticles = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    const tx = Math.cos(angle) * speed * 40;
    const ty = Math.sin(angle) * speed * 40;

    const particle = {
      id: Date.now() + Math.random(),
      x: containerRect.left + canvasRect.width / 2 + window.scrollX,
      y: containerRect.top + canvasRect.height * 0.6 + window.scrollY,
      tx: tx,
      ty: ty,
      size: 8 + Math.random() * 15,
      life: 1,
      opacity: 0.9,
      maxLife: 1,
      isScreenParticle: true,
    };

    newParticles.push(particle);
  }

  return newParticles;
};

// 파티클 애니메이션 업데이트
export const updateParticles = (particles) => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.04;
    p.x += p.tx * 0.15;
    p.y += p.ty * 0.15;
    p.ty += 0.8;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
};
