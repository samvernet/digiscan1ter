// Configuration
const CONFIG = {
  SHEET_ID: '1gwe5oyDjs_u_qbLbRkjF3cCvLAm1dUO_fG0agUAjfjU',
  TRACKING_SHEET_ID: '13d0sO0isKMQWP5rkkLxhbzpgIVGrd1pARzFLfACMDE0',
  TRACKING_SCRIPT_URL:
    'https://script.google.com/macros/s/AKfycbxxP4Zd-7oozh9EUBSEo5uIf620NYN2bgw3KI9mU5Jx-j9kEC5b2DGI_vILRS6Ae20h/exec',
};

const PLATFORMS = [
  { key: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
  { key: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { key: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
  { key: 'website', name: 'Site Web', icon: '🌐', color: '#059669' },
  { key: 'googleMyBusiness', name: 'Google My Business', icon: '📍', color: '#4285F4' },
  { key: 'pagesJaunes', name: 'Pages Jaunes', icon: '📞', color: '#FFD700' },
  { key: 'youtube', name: 'YouTube', icon: '📺', color: '#FF0000' },
  { key: 'tripadvisor', name: 'Tripadvisor', icon: '✈️', color: '#00AF87' },
];

// Variables globales
let analysisData = null;
let selectedCompany = null;
let userInfo = null;
let radarChart = null;
let performanceChart = null;

// Utilitaires
function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const str = value.toString().toLowerCase().trim();
  return ['oui', 'yes', '1', 'true', 'vrai'].includes(str);
}

function getGoogleSheetsCsvUrl(sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

function validateAccessCode(code) {
  return analysisData && analysisData.accessCodes[code] || null;
}

function getVisibilityLevel(score) {
  if (score < 25) {
    return {
      level: 'Faible',
      description: 'Votre visibilité digitale nécessite une attention immédiate. Il est crucial de développer votre présence sur les plateformes digitales essentielles pour rester compétitif.',
      className: 'faible',
      icon: '📊',
    };
  } else if (score >= 25 && score <= 50) {
    return {
      level: 'Modéré',
      description: 'Votre entreprise a établi une base digitale solide, mais il existe encore des opportunités d\'amélioration pour maximiser votre visibilité en ligne.',
      className: 'modere',
      icon: '🎯',
    };
  } else {
    return {
      level: 'Dynamique',
      description: 'Excellent ! Votre entreprise démontre une forte maturité digitale avec une présence bien établie sur les principales plateformes. Continuez à maintenir cette excellence.',
      className: 'dynamique',
      icon: '🏆',
    };
  }
}

// Fonction pour obtenir la couleur de la jauge selon le score
function getGaugeColor(score) {
  if (score < 25) return '#dc2626'; // Rouge
  if (score >= 25 && score <= 50) return '#ea580c'; // Orange
  return '#16a34a'; // Vert
}

// Fonction pour animer la jauge
function animateGauge(score, duration = 2000) {
  const gaugeFill = document.getElementById('gaugeFill');
  const gaugePercentage = document.getElementById('gaugePercentage');
  
  const circumference = 251.33; // Approximation de la longueur de l'arc
  const targetStrokeDasharray = (score / 100) * circumference;
  
  // Couleur selon le score
  const color = getGaugeColor(score);
  gaugeFill.style.stroke = color;
  
  let currentProgress = 0;
  const increment = score / (duration / 16);
  
  const timer = setInterval(() => {
    currentProgress += increment;
    if (currentProgress >= score) {
      currentProgress = score;
      clearInterval(timer);
    }
    
    const strokeDasharray = (currentProgress / 100) * circumference;
    gaugeFill.setAttribute('stroke-dasharray', `${strokeDasharray} ${circumference}`);
    gaugePercentage.textContent = Math.floor(currentProgress) + '%';
  }, 16);
}

// Données de démonstration intégrées
const DEMO_DATA = `Nom de l'entreprise,Facebook,LinkedIn,Instagram,Site Web,Google My Business,Pages Jaunes,YouTube,Tripadvisor,Code d'accès
TechInnovate Solutions,oui,oui,non,oui,oui,non,non,non,TECH2024
Digital Marketing Pro,oui,oui,oui,oui,oui,oui,oui,non,DIGITAL2024
Creative Studio Alpha,oui,oui,oui,oui,non,non,oui,non,CREATIVE2024
Restaurant Le Gourmet,oui,non,oui,oui,oui,oui,non,oui,RESTO2024
Boutique Mode Élégance,oui,oui,oui,oui,oui,non,non,non,MODE2024
Cabinet Avocat Conseil,non,oui,non,oui,oui,oui,non,non,AVOCAT2024
Garage Auto Expert,oui,non,non,oui,oui,oui,non,non,GARAGE2024
Coiffure Beauté Zen,oui,oui,oui,oui,oui,non,non,non,COIFFURE2024
Entreprise Bâtiment Pro,non,oui,non,oui,oui,oui,non,non,BATIMENT2024
Pharmacie du Centre,non,non,non,oui,oui,oui,non,non,PHARMA2024`;

// Fonctions de données
async function fetchGoogleSheetsData() {
  try {
    // Essayer d'abord de récupérer depuis Google Sheets
    const csvUrl = getGoogleSheetsCsvUrl(CONFIG.SHEET_ID);
    const analysisResponse = await fetch(csvUrl);

    if (!analysisResponse.ok) {
      throw new Error('Google Sheets non accessible');
    }

    const analysisData = await analysisResponse.text();
    return { analysisData };
  } catch (error) {
    console.warn('Impossible d\'accéder à Google Sheets, utilisation des données de démonstration:', error);
    // Utiliser les données de démonstration en cas d'échec
    return { analysisData: DEMO_DATA };
  }
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter((line) => line.trim());
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

  const companies = [];
  const accessCodes = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
    if (values.length < headers.length) continue;

    const company = {
      id: `company-${i}`,
      name: values[0] || `Entreprise ${i}`,
      facebook: normalizeBoolean(values[1] || ''),
      linkedin: normalizeBoolean(values[2] || ''),
      instagram: normalizeBoolean(values[3] || ''),
      website: normalizeBoolean(values[4] || ''),
      googleMyBusiness: normalizeBoolean(values[5] || ''),
      pagesJaunes: normalizeBoolean(values[6] || ''),
      youtube: normalizeBoolean(values[7] || ''),
      tripadvisor: normalizeBoolean(values[8] || ''),
      score: 0,
      accessCode: values[9] ? values[9].trim() : '',
    };

    // Calculer le score
    const totalPlatforms = PLATFORMS.length;
    const presentPlatforms = PLATFORMS.filter((p) => company[p.key]).length;
    company.score = Math.round((presentPlatforms / totalPlatforms) * 100);

    companies.push(company);

    // Stocker le code d'accès dans accessCodes
    if (company.accessCode) {
      accessCodes[company.accessCode] = {
        companyName: company.name,
        rowIndex: i,
      };
    }
  }

  // Calculer les moyennes
  const averages = {};
  const globalTotal = companies.reduce((sum, company) => sum + company.score, 0);
  const globalAverage = Math.round(globalTotal / companies.length);

  PLATFORMS.forEach((platform) => {
    const presentCount = companies.filter((company) => company[platform.key]).length;
    averages[platform.key] = Math.round((presentCount / companies.length) * 100);
  });

  return { companies, averages, globalAverage, accessCodes };
}

async function trackUserAccess(userInfo, accessCode) {
  const trackingData = {
    timestamp: new Date().toISOString(),
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    company: userInfo.company,
    email: userInfo.email,
    accessCode: accessCode,
  };

  console.log('Tracking user access:', trackingData);

  try {
    const response = await fetch(CONFIG.TRACKING_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData),
    });

    console.log('Données de tracking envoyées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi des données de tracking:', error);
  }
}

// Fonctions d'interface
function showScreen(screenId) {
  document
    .querySelectorAll('.access-container, .loading-container, .dashboard-container')
    .forEach((el) => {
      el.style.display = 'none';
    });
  document.getElementById(screenId).style.display =
    screenId === 'dashboard' ? 'block' : 'flex';
}

function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);

  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target + '%';
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start) + '%';
    }
  }, 16);
}

function updateVisibilityCard() {
  const card = document.getElementById('visibilityCard');
  const level = document.getElementById('visibilityLevel');
  const description = document.getElementById('visibilityDescription');
  const icon = document.querySelector('.visibility-icon');
  const textElement = document.querySelector('.visibility-text');

  const visibilityInfo = getVisibilityLevel(selectedCompany.score);

  card.className = 'visibility-card glass-card';
  textElement.className = 'visibility-text';

  card.classList.add(visibilityInfo.className);
  textElement.classList.add(visibilityInfo.className);

  level.textContent = `Niveau de Visibilité : ${visibilityInfo.level}`;
  description.textContent = visibilityInfo.description;
  icon.textContent = visibilityInfo.icon;
}

function updatePlatformsGrid() {
  const grid = document.getElementById('platformsGrid');
  grid.innerHTML = '';

  PLATFORMS.forEach((platform) => {
    const isPresent = selectedCompany[platform.key];
    const averageScore = analysisData.averages[platform.key];
    const companyScore = isPresent ? 100 : 0;

    let trendIcon = '=';
    let trendClass = 'trend-equal';
    if (companyScore > averageScore) {
      trendIcon = '↗';
      trendClass = 'trend-up';
    } else if (companyScore < averageScore) {
      trendIcon = '↘';
      trendClass = 'trend-down';
    }

    const card = document.createElement('div');
    card.className = 'platform-card';
    card.innerHTML = `
            <div class="platform-header">
                <div class="platform-info">
                    <span class="platform-icon">${platform.icon}</span>
                    <span class="platform-name">${platform.name}</span>
                </div>
                <span class="trend-icon ${trendClass}">${trendIcon}</span>
            </div>
            
            <div class="platform-status">
                <span class="status-badge ${isPresent ? 'present' : 'absent'}">
                    ${isPresent ? 'Présent ✓' : 'Absent ✗'}
                </span>
            </div>
            
            <div class="progress-section">
                <div class="progress-header">
                    <span class="progress-label">Votre entreprise</span>
                    <span class="progress-value">${companyScore}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill company ${!isPresent ? 'absent' : ''}" 
                         style="width: ${companyScore}%"></div>
                </div>
            </div>
            
            <div class="progress-section">
                <div class="progress-header">
                    <span class="progress-label">Moyenne</span>
                    <span class="progress-value">${averageScore}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill average" style="width: ${averageScore}%"></div>
                </div>
            </div>
        `;

    grid.appendChild(card);
  });
}

function createRadarChart() {
  const ctx = document.getElementById('radarChart').getContext('2d');

  if (radarChart) {
    radarChart.destroy();
  }

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: PLATFORMS.map((p) => p.name),
      datasets: [
        {
          label: selectedCompany.name,
          data: PLATFORMS.map((p) => (selectedCompany[p.key] ? 100 : 0)),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointRadius: 4,
        },
        {
          label: 'Moyenne du marché',
          data: PLATFORMS.map((p) => analysisData.averages[p.key]),
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.8)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: 'rgba(156, 163, 175, 0.8)',
          pointBorderColor: '#fff',
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
          },
        },
      },
    },
  });
}

function createPerformanceChart() {
  const ctx = document.getElementById('performanceChart').getContext('2d');

  if (performanceChart) {
    performanceChart.destroy();
  }

  performanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: PLATFORMS.map((p) => p.name),
      datasets: [
        {
          label: selectedCompany.name,
          data: PLATFORMS.map((p) => (selectedCompany[p.key] ? 100 : 0)),
          backgroundColor: PLATFORMS.map((p) => {
            const isPresent = selectedCompany[p.key];
            return isPresent ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
          }),
          borderRadius: 8,
        },
        {
          label: 'Moyenne du marché',
          data: PLATFORMS.map((p) => analysisData.averages[p.key]),
          backgroundColor: 'rgba(156, 163, 175, 0.6)',
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + '%';
            },
          },
        },
      },
    },
  });
}

function updateDashboard() {
  if (!selectedCompany || !analysisData) return;

  // Mettre à jour le nom de l'entreprise et la jauge
  document.getElementById('companyName').textContent = selectedCompany.name;
  animateGauge(selectedCompany.score);

  // Mettre à jour les titres
  document.getElementById('radarTitle').textContent = `Comparaison Radar - ${selectedCompany.name}`;
  document.getElementById('performanceTitle').textContent = `Performance par Plateforme - ${selectedCompany.name}`;
  document.getElementById('analysisTitle').textContent = `Etude de la visibilité web de ${selectedCompany.name}`;
  document.getElementById('analysisScore').textContent = `Score global : ${selectedCompany.score}%`;

  // Mettre à jour les composants
  updateVisibilityCard();
  updatePlatformsGrid();
  createRadarChart();
  createPerformanceChart();
}

// Export PDF
function exportToPDF() {
  if (!selectedCompany) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  // Header
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, 210, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text('Rapport de Maturité Digitale', 20, 25);

  pdf.setFontSize(10);
  pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 35);

  // Company info
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.text(`Entreprise: ${selectedCompany.name}`, 20, 60);
  pdf.text(`Score Global: ${selectedCompany.score}%`, 20, 75);

  const visibilityInfo = getVisibilityLevel(selectedCompany.score);
  pdf.text(`Niveau de Visibilité: ${visibilityInfo.level}`, 20, 90);

  // Platforms
  let yPos = 110;
  pdf.setFontSize(12);
  pdf.text('Analyse par Plateforme:', 20, yPos);

  PLATFORMS.forEach((platform) => {
    yPos += 15;
    const status = selectedCompany[platform.key] ? 'Présent' : 'Absent';
    const average = analysisData.averages[platform.key];
    pdf.text(`${platform.name}: ${status} (Moyenne: ${average}%)`, 25, yPos);
  });

  pdf.save(`rapport-${selectedCompany.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const { analysisData: csvData } = await fetchGoogleSheetsData();
    analysisData = parseCSV(csvData);
    console.log('Access codes loaded:', analysisData.accessCodes);
  } catch (error) {
    console.error('Failed to load access codes:', error);
    alert('Failed to load access codes from Google Sheet. Check the console for details.');
  }

  // Formulaire de connexion
  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      company: document.getElementById('company').value,
      email: document.getElementById('email').value,
      accessCode: document.getElementById('accessCode').value,
    };

    // Valider le code d'accès
    const accessInfo = validateAccessCode(formData.accessCode);
    if (!accessInfo) {
      alert('Code d\'accès invalide');
      return;
    }

    userInfo = formData;
    showScreen('loadingScreen');

    try {
      // Tracker l'accès utilisateur
      await trackUserAccess(userInfo, formData.accessCode);

      // Charger les données
      const { analysisData: csvData } = await fetchGoogleSheetsData();
      analysisData = parseCSV(csvData);

      // Sélectionner l'entreprise
      if (accessInfo.rowIndex === -1) {
        selectedCompany = analysisData.companies[0];
      } else {
        selectedCompany = analysisData.companies.find((c) =>
          c.name.toLowerCase().includes(accessInfo.companyName.toLowerCase())
        ) || analysisData.companies[accessInfo.rowIndex - 1];
      }

      // Mettre à jour l'interface
      document.getElementById('companiesCount').textContent = 
        `Analyse complète de ${analysisData.companies.length} entreprises`;

      animateCounter(document.getElementById('globalScore'), analysisData.globalAverage);

      updateDashboard();
      showScreen('dashboard');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des données: ' + error.message);
      showScreen('accessForm');
    }
  });

  // Bouton d'export
  document.getElementById('exportIndividual').addEventListener('click', exportToPDF);

  // Bouton retour
  document.getElementById('backBtn').addEventListener('click', function () {
    showScreen('accessForm');
    document.getElementById('loginForm').reset();
    userInfo = null;
    analysisData = null;
    selectedCompany = null;
  });
});
    </script>
</body>
</html>