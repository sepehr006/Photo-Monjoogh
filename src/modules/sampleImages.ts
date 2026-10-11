/**
 * Generates offline, zero-network test fashion photos for verification
 * Tests:
 * 1. Single model fashion portrait (beige studio cyclorama, coat & pants)
 * 2. Dual models side-by-side (landscape image, tests multi-subject choice)
 * 3. High-resolution heavy image (tests >200KB decision workflow)
 */

export async function createSampleFashionPhoto(
  type: 'single' | 'dual' | 'highres'
): Promise<File> {
  const canvas = document.createElement('canvas');

  if (type === 'single') {
    // 1200 x 1500 (4:5 input, will need 3:4 crop)
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d')!;

    // Studio background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1500);
    bgGrad.addColorStop(0, '#f2f0ea');
    bgGrad.addColorStop(1, '#e3ded5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1500);

    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.ellipse(600, 1420, 260, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Model silhouette & garment
    // Head / Hair
    ctx.fillStyle = '#2c1e18';
    ctx.beginPath();
    ctx.arc(600, 280, 75, 0, Math.PI * 2);
    ctx.fill();

    // Face / Skin (warm skin tone)
    ctx.fillStyle = '#e8beac';
    ctx.beginPath();
    ctx.ellipse(600, 310, 52, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#dfb09e';
    ctx.fillRect(580, 360, 40, 55);

    // Fashion Trench Coat (Elegance caramel beige)
    ctx.fillStyle = '#bfa181';
    ctx.beginPath();
    ctx.moveTo(560, 400);
    ctx.lineTo(640, 400);
    ctx.lineTo(760, 650);
    ctx.lineTo(780, 1050);
    ctx.lineTo(420, 1050);
    ctx.lineTo(440, 650);
    ctx.closePath();
    ctx.fill();

    // Coat lapel details (darker contrast)
    ctx.fillStyle = '#9e8163';
    ctx.beginPath();
    ctx.moveTo(600, 410);
    ctx.lineTo(550, 580);
    ctx.lineTo(600, 720);
    ctx.lineTo(650, 580);
    ctx.closePath();
    ctx.fill();

    // Belt detail
    ctx.fillStyle = '#6b543d';
    ctx.fillRect(490, 700, 220, 24);

    // Pants (Dark charcoal)
    ctx.fillStyle = '#23272e';
    ctx.fillRect(500, 1050, 85, 330);
    ctx.fillRect(615, 1050, 85, 330);

    // Shoes
    ctx.fillStyle = '#111317';
    ctx.beginPath();
    ctx.ellipse(540, 1390, 45, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(660, 1390, 45, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.94)
    );
    return new File([blob], 'model_autumn_coat.jpg', { type: 'image/jpeg' });
  }

  if (type === 'dual') {
    // Landscape photo: 2000 x 1333 (Tests multi-model detection and selection)
    canvas.width = 2000;
    canvas.height = 1333;
    const ctx = canvas.getContext('2d')!;

    // Clean modern grey backdrop
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(0, 0, 2000, 1333);

    // Shadows
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(650, 1260, 220, 35, 0, 0, Math.PI * 2);
    ctx.ellipse(1350, 1260, 220, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Model 1 (Left / Visual Right in RTL: x ~ 650)
    // Head
    ctx.fillStyle = '#3a251e';
    ctx.beginPath();
    ctx.arc(650, 260, 65, 0, Math.PI * 2);
    ctx.fill();
    // Face
    ctx.fillStyle = '#e5beab';
    ctx.beginPath();
    ctx.ellipse(650, 285, 45, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jacket 1: Olive bomber jacket
    ctx.fillStyle = '#4c5e3d';
    ctx.beginPath();
    ctx.moveTo(615, 340);
    ctx.lineTo(685, 340);
    ctx.lineTo(770, 520);
    ctx.lineTo(760, 840);
    ctx.lineTo(540, 840);
    ctx.lineTo(530, 520);
    ctx.closePath();
    ctx.fill();
    // Jeans
    ctx.fillStyle = '#2d4363';
    ctx.fillRect(570, 840, 70, 390);
    ctx.fillRect(660, 840, 70, 390);

    // Model 2 (Right: x ~ 1350)
    // Head
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(1350, 250, 68, 0, Math.PI * 2);
    ctx.fill();
    // Face
    ctx.fillStyle = '#ecc7b5';
    ctx.beginPath();
    ctx.ellipse(1350, 275, 46, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    // Garment 2: Burgundy blazer
    ctx.fillStyle = '#782635';
    ctx.beginPath();
    ctx.moveTo(1315, 335);
    ctx.lineTo(1385, 335);
    ctx.lineTo(1480, 530);
    ctx.lineTo(1470, 910);
    ctx.lineTo(1230, 910);
    ctx.lineTo(1220, 530);
    ctx.closePath();
    ctx.fill();
    // Trousers
    ctx.fillStyle = '#26292e';
    ctx.fillRect(1270, 910, 70, 320);
    ctx.fillRect(1360, 910, 70, 320);

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.94)
    );
    return new File([blob], 'lookbook_duo_editorial.jpg', { type: 'image/jpeg' });
  }

  // highres photo: 3200 x 4000 (Tests 200KB boundary and dual variant offering)
  canvas.width = 3000;
  canvas.height = 4000;
  const ctx = canvas.getContext('2d')!;

  // Textured background
  const grad = ctx.createRadialGradient(1500, 2000, 200, 1500, 2000, 2400);
  grad.addColorStop(0, '#f9f8f6');
  grad.addColorStop(1, '#d8d4cb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 3000, 4000);

  // High detail knitwear sweater
  ctx.fillStyle = '#442a22';
  ctx.beginPath();
  ctx.arc(1500, 800, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eec5b3';
  ctx.beginPath();
  ctx.ellipse(1500, 880, 140, 175, 0, 0, Math.PI * 2);
  ctx.fill();

  // Emerald green textured sweater
  ctx.fillStyle = '#1b4d3e';
  ctx.beginPath();
  ctx.moveTo(1380, 1050);
  ctx.lineTo(1620, 1050);
  ctx.lineTo(1950, 1600);
  ctx.lineTo(1920, 2550);
  ctx.lineTo(1080, 2550);
  ctx.lineTo(1050, 1600);
  ctx.closePath();
  ctx.fill();

  // Add micro fabric texture noise so file size is naturally larger
  for (let y = 1100; y < 2500; y += 40) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(1100, y, 800, 18);
  }

  // Trousers
  ctx.fillStyle = '#e8ded1'; // Beige pleated trousers
  ctx.fillRect(1170, 2550, 300, 1200);
  ctx.fillRect(1530, 2550, 300, 1200);

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), 'image/jpeg', 0.98)
  );
  return new File([blob], 'highres_knitwear_catalog.jpg', { type: 'image/jpeg' });
}
