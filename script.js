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
  {
    key: 'googleMyBusiness',
    name: 'Google My Business',
    icon: '📍',
    color: '#4285F4',
  },
  {
    key: 'pagesJaunes',
    name: 'Pages Jaunes',
    icon: '📞',
    color: '#FFD700',
  },
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
      description:
        'Votre visibilité digitale nécessite une attention immédiate. Il est crucial de développer votre présence sur les plateformes digitales essentielles pour rester compétitif.',
      className: 'faible',
      icon: '📊',
    };
  } else if (score >= 25 && score <= 50) {
    return {
      level: 'Modéré',
      description:
        'Votre entreprise a établi une base digitale solide, mais il existe encore des opportunités d\'amélioration pour maximiser votre visibilité en ligne.',
      className: 'modere',
      icon: '🎯',
    };
  } else {
    return {
      level: 'Dynamique',
      description:
        'Excellent ! Votre entreprise démontre une forte maturité digitale avec une présence bien établie sur les principales plateformes. Continuez à maintenir cette excellence.',
      className: 'dynamique',
      icon: '🏆',
    };
  }
}

function getScoreColor(score) {
  if (score < 25) {
    return {
      primary: '#dc2626',
      secondary: '#fca5a5',
      background: 'rgba(254, 226, 226, 0.3)',
      status: 'À améliorer'
    };
  } else if (score >= 25 && score <= 50) {
    return {
      primary: '#ea580c',
      secondary: '#fdba74',
      background: 'rgba(255, 237, 213, 0.3)',
      status: 'En développement'
    };
  } else {
    return {
      primary: '#16a34a',
      secondary: '#86efac',
      background: 'rgba(220, 252, 231, 0.3)',
      status: 'Excellent'
    };
  }
}

// Fonctions de données
async function fetchGoogleSheetsData() {
  const csvUrl = getGoogleSheetsCsvUrl(CONFIG.SHEET_ID);

  try {
    const analysisResponse = await fetch(csvUrl);

    if (!analysisResponse.ok) {
      throw new Error(
        `Erreur HTTP (Analysis Sheet): ${analysisResponse.status}. Vérifiez que le Google Sheet est public.`
      );
    }

    const analysisData = await analysisResponse.text();

    return { analysisData };
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw new Error(
      'Impossible de récupérer les données du Google Sheet. Vérifiez la configuration.'
    );
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
  const globalTotal = companies.reduce(
    (sum, company) => sum + company.score,
    0
  );
  const globalAverage = Math.round(globalTotal / companies.length);

  PLATFORMS.forEach((platform) => {
    const presentCount = companies.filter((company) => company[platform.key])
      .length;
    averages[platform.key] = Math.round(
      (presentCount / companies.length) * 100
    );
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

function updateCompanyScoreDisplay() {
  if (!selectedCompany) return;

  const companyNameElement = document.getElementById('selectedCompanyName');
  const scoreValueElement = document.getElementById('companyScoreValue');
  const scoreCircleElement = document.getElementById('scoreCircle');
  const scoreStatusElement = document.getElementById('scoreStatus');
  const scoreDescriptionElement = document.getElementById('scoreDescription');

  // Mettre à jour le nom de l'entreprise
  companyNameElement.textContent = selectedCompany.name;

  // Obtenir les couleurs et statut basés sur le score
  const scoreInfo = getScoreColor(selectedCompany.score);
  const visibilityInfo = getVisibilityLevel(selectedCompany.score);

  // Mettre à jour le statut et la description
  scoreStatusElement.textContent = scoreInfo.status;
  scoreDescriptionElement.textContent = visibilityInfo.description;

  // Animer le score
  animateCounter(scoreValueElement, selectedCompany.score);

  // Appliquer les styles dynamiques
  scoreCircleElement.style.borderColor = scoreInfo.primary;
  scoreCircleElement.style.background = `conic-gradient(${scoreInfo.primary} ${selectedCompany.score * 3.6}deg, ${scoreInfo.secondary} ${selectedCompany.score * 3.6}deg)`;
  scoreCircleElement.classList.remove('score-faible', 'score-modere', 'score-dynamique');
  
  if (selectedCompany.score < 25) {
    scoreCircleElement.classList.add('score-faible');
  } else if (selectedCompany.score <= 50) {
    scoreCircleElement.classList.add('score-modere');
  } else {
    scoreCircleElement.classList.add('score-dynamique');
  }

  // Ajouter une animation à l'élément
  scoreCircleElement.style.animation = 'scoreAnimation 1.5s ease-out';
  setTimeout(() => {
    scoreCircleElement.style.animation = '';
  }, 1500);
}

function updateVisibilityCard() {
  const card = document.getElementById('visibilityCard');
  const level = document.getElementById('visibilityLevel');
  const description = document.getElementById('visibilityDescription');
  const icon = document.querySelector('.visibility-icon');
  const textElement = document.querySelector('.visibility-text');

  const visibilityInfo = getVisibilityLevel(selectedCompany.score);

  // Réinitialiser les classes
  card.className = 'visibility-card glass-card';
  textElement.className = 'visibility-text';

  // Ajouter les nouvelles classes
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
          label: 'Moyenne de la concurrence',
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
            return isPresent
              ? 'rgba(34, 197, 94, 0.8)'
              : 'rgba(239, 68, 68, 0.8)';
          }),
          borderRadius: 8,
        },
        {
          label: 'Moyenne de la concurrence',
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

  // Mettre à jour les titres
  document.getElementById('radarTitle').textContent = `Comparaison Radar - ${selectedCompany.name}`;
  document.getElementById('performanceTitle').textContent = `Performance par Plateforme - ${selectedCompany.name}`;
  document.getElementById('analysisTitle').textContent = `Etude de la visibilité web de ${selectedCompany.name}`;
  document.getElementById('analysisScore').textContent = `Score global : ${selectedCompany.score}%`;

  // Mettre à jour les composants
  updateCompanyScoreDisplay();
  updateVisibilityCard();
  updatePlatformsGrid();
  createRadarChart();
  createPerformanceChart();
}

// Fonction d'impression (remplace l'export PDF)
function printReport() {
  if (!selectedCompany) return;
  
  // Déclencher l'impression de la page
  window.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async function () {
  // Load access codes from Google Sheet
  try {
    const { analysisData: csvData } = await fetchGoogleSheetsData();
    analysisData = parseCSV(csvData);
    console.log('Access codes loaded:', analysisData.accessCodes);
  } catch (error) {
    console.error('Failed to load access codes:', error);
    alert(
      'Failed to load access codes from Google Sheet. Check the console for details.'
    );
  }

  // Formulaire de connexion
  document
    .getElementById('loginForm')
    .addEventListener('submit', async function (e) {
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
          selectedCompany =
            analysisData.companies.find((c) =>
              c.name.toLowerCase().includes(accessInfo.companyName.toLowerCase())
            ) || analysisData.companies[accessInfo.rowIndex - 1];
        }

        // Mettre à jour l'interface
        document.getElementById('companiesCount').textContent = `Analyse complète de ${analysisData.companies.length} entreprises`;

        animateCounter(
          document.getElementById('globalScore'),
          analysisData.globalAverage
        );

        updateDashboard();

        showScreen('dashboard');
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des données: ' + error.message);
        showScreen('accessForm');
      }
    });

  // Bouton d'export (impression)
  document
    .getElementById('exportIndividual')
    .addEventListener('click', printReport);

  // Bouton retour
  document.getElementById('backBtn').addEventListener('click', function () {
    showScreen('accessForm');
    // Reset form
    document.getElementById('loginForm').reset();
    userInfo = null;
    analysisData = null;
    selectedCompany = null;
  });

});
