/* js/app.js */

// Colores del semáforo pedagógico
const COLORS = {
    good: 'rgba(75, 192, 192, 0.7)',   // Verde
    warning: 'rgba(255, 205, 86, 0.7)', // Amarillo
    alert: 'rgba(255, 159, 64, 0.7)',   // Naranja
    critical: 'rgba(255, 99, 132, 0.7)', // Rojo
    neutral: '#e0e0e0',
    colombia: '#6c757d',
    etc: '#adb5bd'
};

// Banco de Estrategias Pedagógicas (Genérico basado en competencias)
const ESTRATEGIAS_PEDAGOGICAS = {
    "Ciencias Naturales": [
        { title: "Fortalecimiento de la Indagación", text: "Implementar rutinas de pensamiento (VEO-PIENSO-ME PREGUNTO) antes de iniciar laboratorios para formular hipótesis claras." },
        { title: "Uso del Conocimiento Científico", text: "Trabajar con noticias científicas actuales para que el estudiante aplique conceptos teóricos en contextos reales." },
        { title: "Explicación de Fenómenos", text: "Utilizar la metodología de 'Argumentación Científica' donde el estudiante deba justificar por qué ocurre un fenómeno usando datos." }
    ],
    "Sociales y Ciudadanas": [
        { title: "Pensamiento Sistémico", text: "Realizar debates tipo ONU donde se analice un problema desde dimensiones económicas, políticas y culturales simultáneamente." },
        { title: "Multiperspectivismo", text: "Analizar fuentes históricas contradictorias para entender diferentes visiones de un mismo hecho." }
    ],
    "Lectura Crítica": [
        { title: "Lectura Inferencial", text: "Diseñar preguntas que no estén explícitas en el texto. Preguntar '¿Cuál es la intención oculta del autor?'." },
        { title: "Textos Discontinuos", text: "Entrenar lectura de infografías, cómics y tablas estadísticas." }
    ],
    "Matemáticas": [
        { title: "Resolución de Problemas", text: "Aplicar el método de Polya en clase. No solo buscar la respuesta, sino documentar el proceso de solución." },
        { title: "Razonamiento Cuantitativo", text: "Usar recibos de servicios públicos o noticias financieras para contextualizar las operaciones básicas." }
    ],
    "Inglés": [
        { title: "Exposición al idioma", text: "Aumentar el input comprensible auditivo. Dedicar 10 minutos de la clase a 'Listening' sin subtítulos." },
        { title: "Vocabulario en Contexto", text: "Evitar listas de palabras aisladas. Aprender frases completas (chunks)." }
    ]
};

// ------------------------------------------
// LÓGICA DASHBOARD GLOBAL
// ------------------------------------------
async function loadGlobalData() {
    try {
        const response = await fetch('data/general.json');
        const json = await response.json();
        
        // Extraer datos (Simplificación de la estructura para el ejemplo)
        const eeData = json.datos.find(d => d.nivel_agregacion.includes("Establecimiento"));
        const colData = json.datos.find(d => d.nivel_agregacion === "Colombia");
        
        // Mapeo de años (limpiar "2023-4" a "2023")
        const years = Object.keys(eeData.metricas.promedio_puntaje_global).map(y => y.split('-')[0]);
        const scoresEE = Object.values(eeData.metricas.promedio_puntaje_global);
        const scoresCOL = Object.values(colData.metricas.promedio_puntaje_global);

        const ctx = document.getElementById('globalChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'IED Hogar Mariano',
                        data: scoresEE,
                        borderColor: '#003366',
                        backgroundColor: '#003366',
                        borderWidth: 3,
                        tension: 0.3
                    },
                    {
                        label: 'Promedio Colombia',
                        data: scoresCOL,
                        borderColor: '#6c757d',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Evolución Puntaje Global' }
                },
                scales: {
                    y: { beginAtZero: false, min: 200, max: 350 }
                }
            }
        });

    } catch (error) {
        console.error("Error cargando global:", error);
    }
}

// ------------------------------------------
// LÓGICA DETALLE DE ÁREA
// ------------------------------------------
async function loadAreaData(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();

        // 1. Título
        document.getElementById('areaTitle').innerText = data.informacion_reporte.area;

        // 2. Determinar si el área es Inglés (Estructura diferente)
        if (data.informacion_reporte.area === 'Inglés') {
            renderEnglishCharts(data);
        } else {
            renderStandardAreaCharts(data);
        }

        // 3. Cargar Estrategias
        renderStrategies(data.informacion_reporte.area);

    } catch (error) {
        console.error("Error cargando área:", error);
        document.getElementById('areaTitle').innerText = "Error cargando datos. Verifique la consola.";
    }
}

function renderStandardAreaCharts(data) {
    const yearsRaw = Object.keys(data.resultados_generales.niveles_desempeno.datos[0].niveles.nivel_1);
    const years = yearsRaw.map(y => y.split('-')[0]); // "2023", "2024"...

    // --- GRÁFICA 1: NIVELES DE DESEMPEÑO (EE) ---
    const nivelesData = data.resultados_generales.niveles_desempeno.datos.find(d => d.nivel_agregacion.includes("Establecimiento"));
    
    // Preparar datasets apilados
    const datasetsNiveles = [];
    const colorsNivel = [COLORS.critical, COLORS.alert, COLORS.warning, COLORS.good]; // Nivel 1(rojo) a 4(verde)
    let i = 0;
    for (const [nivelName, valores] of Object.entries(nivelesData.niveles)) {
        datasetsNiveles.push({
            label: nivelName.replace('_', ' ').toUpperCase(),
            data: Object.values(valores),
            backgroundColor: colorsNivel[i % 4]
        });
        i++;
    }

    new Chart(document.getElementById('levelsChart'), {
        type: 'bar',
        data: { labels: years, datasets: datasetsNiveles },
        options: {
            plugins: { title: { display: true, text: '% Estudiantes por Nivel' } },
            responsive: true,
            scales: { x: { stacked: true }, y: { stacked: true, max: 100 } }
        }
    });

    // --- GRÁFICA 2: EVIDENCIAS (BARRA HORIZONTAL) ---
    // Detectar si la métrica es "Incorrecta" o "Correcta"
    const firstEvidencia = data.evidencias_aprendizaje[0];
    const isIncorrectMetric = firstEvidencia.hasOwnProperty('porcentaje_respuestas_incorrectas');
    const metricKey = isIncorrectMetric ? 'porcentaje_respuestas_incorrectas' : 'porcentaje_respuestas_correctas';
    const lastYearKey = yearsRaw[yearsRaw.length - 1]; // Tomar el último año (2025)

    const labels = [];
    const dataEE = [];
    const dataCOL = [];
    const fullDescriptions = [];

    data.evidencias_aprendizaje.forEach(ev => {
        // Acortar descripción para el eje Y
        labels.push(`Evidencia ${ev.id_evidencia}`);
        fullDescriptions.push(ev.descripcion);

        // Obtener datos del último año
        const metricasEE = ev[metricKey].find(x => x.nivel_agregacion.includes("Establecimiento"));
        const metricasCOL = ev[metricKey].find(x => x.nivel_agregacion === "Colombia");

        dataEE.push(metricasEE.aplicaciones[lastYearKey] || 0);
        dataCOL.push(metricasCOL.aplicaciones[lastYearKey] || 0);
    });

    // Función para asignar color basado en si es bueno o malo
    const getColor = (value) => {
        if (isIncorrectMetric) {
            // Si mide ERROR: Bajo es Verde, Alto es Rojo
            if (value <= 20) return COLORS.good;
            if (value <= 40) return COLORS.warning;
            if (value <= 70) return COLORS.alert;
            return COLORS.critical;
        } else {
            // Si mide ACIERTO: Alto es Verde, Bajo es Rojo
            if (value >= 70) return COLORS.good;
            if (value >= 40) return COLORS.warning;
            if (value >= 20) return COLORS.alert;
            return COLORS.critical;
        }
    };

    const backgroundColors = dataEE.map(val => getColor(val));

    new Chart(document.getElementById('evidenceChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `IED Hogar Mariano (${isIncorrectMetric ? '% Incorrectas' : '% Correctas'})`,
                    data: dataEE,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                },
                {
                    label: 'Colombia (Ref)',
                    data: dataCOL,
                    backgroundColor: COLORS.colombia,
                    hidden: true // Oculto por defecto para limpieza visual
                }
            ]
        },
        options: {
            indexAxis: 'y', // Barra horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        // Mostrar descripción completa en el tooltip
                        afterLabel: function(context) {
                            return fullDescriptions[context.dataIndex].match(/.{1,60}/g); // Wrap text
                        }
                    }
                },
                legend: { position: 'top' }
            },
            scales: { x: { max: 100 } }
        }
    });
}

function renderEnglishCharts(data) {
    // Lógica simplificada para Inglés (Solo niveles)
    document.getElementById('evidenceChart').style.display = 'none'; // No hay evidencias en inglés json
    
    const yearsRaw = Object.keys(data.resultados_generales.niveles_desempeno.datos[0].niveles.nivel_A_menos);
    const years = yearsRaw.map(y => y.split('-')[0]);

    const nivelesData = data.resultados_generales.niveles_desempeno.datos.find(d => d.nivel_agregacion.includes("Establecimiento"));
    
    const datasets = [];
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997']; // A- hasta B+
    let i = 0;
    
    const orderedLevels = ['nivel_A_menos', 'nivel_A1', 'nivel_A2', 'nivel_B1', 'nivel_B_mas'];

    orderedLevels.forEach(lvl => {
        if(nivelesData.niveles[lvl]){
            datasets.push({
                label: lvl.replace('nivel_', '').replace('_', ' ').toUpperCase(),
                data: Object.values(nivelesData.niveles[lvl]),
                backgroundColor: colors[i]
            });
            i++;
        }
    });

    new Chart(document.getElementById('levelsChart'), {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: {
            plugins: { title: { display: true, text: 'Distribución Niveles de Inglés (MCER)' } },
            responsive: true,
            scales: { x: { stacked: true }, y: { stacked: true, max: 100 } }
        }
    });
}

function renderStrategies(areaName) {
    const container = document.getElementById('strategiesContainer');
    const strategies = ESTRATEGIAS_PEDAGOGICAS[areaName] || ESTRATEGIAS_PEDAGOGICAS["Ciencias Naturales"]; // Fallback

    let html = '';
    strategies.forEach(st => {
        html += `
            <div class="strategy-card">
                <h4>📌 ${st.title}</h4>
                <p>${st.text}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}
