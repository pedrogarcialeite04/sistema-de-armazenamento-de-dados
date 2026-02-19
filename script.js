// Classe principal do aplicativo
class CaminhaoPranchaApp {
    constructor() {
        this.servicos = this.carregarServicos();
        this.servicoEditando = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderServicos();
        this.atualizarEstatisticas();
        this.popularFiltroMotoristas();
        this.aplicarMascaras();
    }

    // LocalStorage
    carregarServicos() {
        const dados = localStorage.getItem('servicos-caminhao-prancha');
        return dados ? JSON.parse(dados) : [];
    }

    salvarServicos() {
        localStorage.setItem('servicos-caminhao-prancha', JSON.stringify(this.servicos));
    }

    // Event Listeners
    setupEventListeners() {
        // Modal
        document.getElementById('btnNovoServico').addEventListener('click', () => this.abrirModal());
        document.getElementById('btnCloseModal').addEventListener('click', () => this.fecharModal());
        document.getElementById('btnCancelar').addEventListener('click', () => this.fecharModal());
        
        // Fechar modal ao clicar fora
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.fecharModal();
            }
        });

        // Formulário
        document.getElementById('servicoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarServico();
        });

        // Cálculo automático de KM
        document.getElementById('kmSaida').addEventListener('input', () => this.calcularKmTotal());
        document.getElementById('kmChegada').addEventListener('input', () => this.calcularKmTotal());

        // Busca e filtros
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarServicos(e.target.value));
        document.getElementById('filterMotorista').addEventListener('change', (e) => this.filtrarPorMotorista(e.target.value));
        document.getElementById('btnLimparFiltros').addEventListener('click', () => this.limparFiltros());
    }

    // Máscaras de input
    aplicarMascaras() {
        // Máscara de moeda para Valor Total
        const valorTotal = document.getElementById('valorTotal');
        valorTotal.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '');
            valor = (parseInt(valor) / 100).toFixed(2);
            e.target.value = this.formatarMoeda(parseFloat(valor));
        });

        // Máscara de moeda para Pedágio
        const pedagio = document.getElementById('pedagio');
        pedagio.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor === '') {
                e.target.value = '';
                return;
            }
            valor = (parseInt(valor) / 100).toFixed(2);
            e.target.value = this.formatarMoeda(parseFloat(valor));
        });
    }

    formatarMoeda(valor) {
        if (isNaN(valor)) return 'R$ 0,00';
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    parseMoeda(valor) {
        if (!valor) return 0;
        return parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    // Modal
    abrirModal(servico = null) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('servicoForm');

        if (servico) {
            // Modo edição
            this.servicoEditando = servico;
            modalTitle.textContent = 'Editar Serviço';
            this.preencherFormulario(servico);
        } else {
            // Modo novo
            this.servicoEditando = null;
            modalTitle.textContent = 'Novo Serviço';
            form.reset();
            
            // Define data atual
            const hoje = new Date().toISOString().split('T')[0];
            document.getElementById('data').value = hoje;
        }

        // Mostrar modal PRIMEIRO
        modal.classList.add('active');
        
        // Animar modal com GSAP (se disponível) - SEM BLOQUEAR
        if (typeof gsap !== 'undefined') {
            gsap.fromTo('.modal-content', 
                {
                    scale: 0.95,
                    y: 30,
                    opacity: 0
                },
                {
                    duration: 0.3,
                    scale: 1,
                    y: 0,
                    opacity: 1,
                    ease: 'power2.out'
                }
            );
        }
    }

    fecharModal() {
        const modal = document.getElementById('modal');
        const form = document.getElementById('servicoForm');
        
        // Animar saída com GSAP (se disponível)
        if (typeof gsap !== 'undefined') {
            gsap.to('.modal-content', {
                duration: 0.2,
                scale: 0.95,
                y: 20,
                opacity: 0,
                ease: 'power2.in',
                onComplete: () => {
                    modal.classList.remove('active');
                    form.reset();
                    this.servicoEditando = null;
                }
            });
        } else {
            // Fallback sem animação
            modal.classList.remove('active');
            form.reset();
            this.servicoEditando = null;
        }
    }

    preencherFormulario(servico) {
        document.getElementById('data').value = servico.data;
        document.getElementById('contratante').value = servico.contratante;
        document.getElementById('local').value = servico.local;
        document.getElementById('kmSaida').value = servico.kmSaida;
        document.getElementById('kmChegada').value = servico.kmChegada;
        document.getElementById('kmTotal').value = servico.kmTotal;
        document.getElementById('horarioSaida').value = servico.horarioSaida;
        document.getElementById('horarioChegada').value = servico.horarioChegada;
        document.getElementById('valorTotal').value = this.formatarMoeda(servico.valorTotal);
        document.getElementById('pedagio').value = servico.pedagio ? this.formatarMoeda(servico.pedagio) : '';
        document.getElementById('numeroFrota').value = servico.numeroFrota;
        document.getElementById('observacao').value = servico.observacao || '';
        document.getElementById('motorista').value = servico.motorista;
        document.getElementById('responsavel').value = servico.responsavel || '';
    }

    // Cálculos
    calcularKmTotal() {
        const kmSaida = parseFloat(document.getElementById('kmSaida').value) || 0;
        const kmChegada = parseFloat(document.getElementById('kmChegada').value) || 0;
        const kmTotal = kmChegada - kmSaida;
        
        document.getElementById('kmTotal').value = kmTotal > 0 ? kmTotal.toFixed(1) : '';
    }
    gerarPDF(id) {
        const servico = this.servicos.find(s => String(s.id) === String(id));
        if (!servico) return;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;

        const htmlImpressao = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Comprovante - ${servico.contratante}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; margin-bottom: 30px; padding-bottom: 20px; }
                    .logo { height: 80px; object-fit: contain; }
                    .header-info { text-align: right; }
                    .header-info h1 { margin: 0; color: #4f46e5; font-size: 24px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
                    .box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; background: #fff; }
                    .label { font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
                    .val { font-size: 14px; font-weight: 600; color: #111827; }
                    .observation { margin-top: 20px; padding: 15px; border-left: 4px solid #4f46e5; background: #f9fafb; font-style: italic; }
                    .total-box { margin-top: 30px; background: #4f46e5; color: white; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
                    .total-label { font-size: 14px; font-weight: bold; }
                    .total-val { font-size: 24px; font-weight: 800; }
                    .footer-sig { margin-top: 80px; display: flex; justify-content: space-around; }
                    .sig-line { border-top: 1px solid #9ca3af; width: 220px; text-align: center; font-size: 12px; padding-top: 8px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="Captura_de_Tela__323_-removebg-preview.png" class="logo" onerror="this.src='https://via.placeholder.com/150?text=LOGOTIPO'">
                    <div class="header-info">
                        <h1>Ordem de Serviço</h1>
                        <p>Data: ${this.formatarData(servico.data)} | ID: #${String(servico.id).slice(-6)}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="box"><div class="label">Contratante</div><div class="val">${servico.contratante}</div></div>
                    <div class="box"><div class="label">Frota</div><div class="val">${servico.numeroFrota}</div></div>
                    <div class="box"><div class="label">Motorista</div><div class="val">${servico.motorista}</div></div>
                    <div class="box"><div class="label">Responsável</div><div class="val">${servico.responsavel || 'Não informado'}</div></div>
                    <div class="box"><div class="label">Local/Origem</div><div class="val">${servico.local}</div></div>
                    <div class="box"><div class="label">Horário</div><div class="val">${servico.horarioSaida} às ${servico.horarioChegada}</div></div>
                    <div class="box"><div class="label">KM Saída</div><div class="val">${servico.kmSaida} km</div></div>
                    <div class="box"><div class="label">KM Chegada</div><div class="val">${servico.kmChegada} km</div></div>
                </div>

                <div class="box" style="margin-bottom: 20px; text-align: center;">
                    <div class="label">Total Percorrido</div>
                    <div class="val" style="font-size: 20px; color: #4f46e5;">${servico.kmTotal} km</div>
                </div>

                ${servico.observacao ? `<div class="observation"><div class="label">Observações</div>${servico.observacao}</div>` : ''}

                <div class="total-box">
                    <div>
                        <div class="total-label">Pedágio: ${this.formatarMoeda(servico.pedagio)}</div>
                    </div>
                    <div>
                        <span class="total-label">VALOR TOTAL DO FRETE: </span>
                        <span class="total-val">${this.formatarMoeda(servico.valorTotal)}</span>
                    </div>
                </div>

                <div class="footer-sig">
                    <div class="sig-line">Assinatura do Motorista</div>
                    <div class="sig-line">Assinatura do Cliente</div>
                </div>
            </body>
            </html>
        `;

        doc.write(htmlImpressao);
        doc.close();
        iframe.contentWindow.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    }
    // CRUD
    salvarServico() {
        const servico = {
            id: this.servicoEditando ? this.servicoEditando.id : Date.now(),
            data: document.getElementById('data').value,
            contratante: document.getElementById('contratante').value,
            local: document.getElementById('local').value,
            kmSaida: parseFloat(document.getElementById('kmSaida').value),
            kmChegada: parseFloat(document.getElementById('kmChegada').value),
            kmTotal: parseFloat(document.getElementById('kmTotal').value),
            horarioSaida: document.getElementById('horarioSaida').value,
            horarioChegada: document.getElementById('horarioChegada').value,
            valorTotal: this.parseMoeda(document.getElementById('valorTotal').value),
            pedagio: this.parseMoeda(document.getElementById('pedagio').value),
            numeroFrota: document.getElementById('numeroFrota').value,
            observacao: document.getElementById('observacao').value,
            motorista: document.getElementById('motorista').value,
            responsavel: document.getElementById('responsavel').value
        };

        if (this.servicoEditando) {
            // Atualizar
            const index = this.servicos.findIndex(s => s.id === this.servicoEditando.id);
            this.servicos[index] = servico;
        } else {
            // Adicionar
            this.servicos.push(servico);
        }

        this.salvarServicos();
        this.fecharModal();
        this.renderServicos();
        this.atualizarEstatisticas();
        this.popularFiltroMotoristas();
        
        // Feedback visual
        this.mostrarNotificacao(this.servicoEditando ? 'Serviço atualizado com sucesso!' : 'Serviço cadastrado com sucesso!');
    }

    editarServico(id) {
        const servico = this.servicos.find(s => s.id === id);
        if (servico) {
            this.abrirModal(servico);
        }
    }

    deletarServico(id) {
        if (confirm('Tem certeza que deseja excluir este serviço?')) {
            this.servicos = this.servicos.filter(s => s.id !== id);
            this.salvarServicos();
            this.renderServicos();
            this.atualizarEstatisticas();
            this.popularFiltroMotoristas();
            this.mostrarNotificacao('Serviço excluído com sucesso!', 'danger');
        }
    }

    // Renderização
    renderServicos(servicosFiltrados = null) {
        const lista = servicosFiltrados || this.servicos;
        const container = document.getElementById('servicosList');

        if (lista.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <h3>Nenhum serviço encontrado</h3>
                    <p>${servicosFiltrados ? 'Tente ajustar os filtros de busca' : 'Clique em "Novo Serviço" para adicionar seu primeiro registro'}</p>
                </div>
            `;
            return;
        }

        // Ordenar por data (mais recente primeiro)
        const servicosOrdenados = [...lista].sort((a, b) => {
            return new Date(b.data) - new Date(a.data);
        });

        
        container.innerHTML = servicosOrdenados.map(servico => `
            <div class="service-card">
                <div class="service-header">
                    <div class="service-title">
                        <h3>${servico.contratante}</h3>
                        <p>${this.formatarData(servico.data)} • Frota: ${servico.numeroFrota}</p>
                    </div>
        
                    <div class="service-actions">
                        <button class="btn-icon btn-edit" onclick="app.editarServico(${servico.id})" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="app.deletarServico(${servico.id})" title="Excluir">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                        <button class="btn-icon btn-print" onclick="app.gerarPDF('${servico.id}')" title="Gerar PDF">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
                        </button>
                <div class="service-details">
                    <div class="detail-item">
                        <span class="detail-label">Local</span>
                        <span class="detail-value">${servico.local}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Motorista</span>
                        <span class="detail-value">${servico.motorista}</span>
                    </div>
                    ${servico.responsavel ? `
                        <div class="detail-item">
                            <span class="detail-label">Responsável</span>
                            <span class="detail-value">${servico.responsavel}</span>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <span class="detail-label">Horário</span>
                        <span class="detail-value">${servico.horarioSaida} → ${servico.horarioChegada}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">KM Saída</span>
                        <span class="detail-value">${servico.kmSaida.toLocaleString('pt-BR')} km</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">KM Chegada</span>
                        <span class="detail-value">${servico.kmChegada.toLocaleString('pt-BR')} km</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">KM Total</span>
                        <span class="detail-value highlight">${servico.kmTotal.toLocaleString('pt-BR')} km</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Valor Total</span>
                        <span class="detail-value highlight">${this.formatarMoeda(servico.valorTotal)}</span>
                    </div>
                    ${servico.pedagio > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">Pedágio</span>
                            <span class="detail-value">${this.formatarMoeda(servico.pedagio)}</span>
                        </div>
                    ` : ''}
                </div>
                ${servico.observacao ? `
                    <div class="service-observation">
                        <span class="detail-label">Observação</span>
                        <p>${servico.observacao}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Atualizar badge
        document.getElementById('totalBadge').textContent = `${lista.length} ${lista.length === 1 ? 'serviço' : 'serviços'}`;
        
        // Animar cards com GSAP
        setTimeout(() => {
            if (typeof window.animateServiceCards === 'function') {
                window.animateServiceCards();
            }
        }, 50);
    }

    // Estatísticas
    atualizarEstatisticas() {
        const totalServicos = this.servicos.length;
        const totalKm = this.servicos.reduce((acc, s) => acc + s.kmTotal, 0);
        const totalValor = this.servicos.reduce((acc, s) => acc + s.valorTotal, 0);

        const elementoServicos = document.getElementById('totalServicos');
        const elementoKm = document.getElementById('totalKm');
        const elementoValor = document.getElementById('totalValor');

        elementoServicos.textContent = totalServicos;
        elementoKm.textContent = `${totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
        elementoValor.textContent = this.formatarMoeda(totalValor);
        
        // Animar números com GSAP
        if (typeof gsap !== 'undefined') {
            gsap.from([elementoServicos, elementoKm, elementoValor], {
                duration: 0.5,
                scale: 1.2,
                opacity: 0.5,
                ease: 'back.out(2)',
                stagger: 0.1
            });
        }
    }

    // Filtros
    popularFiltroMotoristas() {
        const motoristas = [...new Set(this.servicos.map(s => s.motorista))].sort();
        const select = document.getElementById('filterMotorista');
        
        const opcaoAtual = select.value;
        select.innerHTML = '<option value="">Todos os Motoristas</option>';
        
        motoristas.forEach(motorista => {
            const option = document.createElement('option');
            option.value = motorista;
            option.textContent = motorista;
            if (motorista === opcaoAtual) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    buscarServicos(termo) {
        if (!termo) {
            this.renderServicos();
            return;
        }

        termo = termo.toLowerCase();
        const resultados = this.servicos.filter(servico => {
            return (
                servico.contratante.toLowerCase().includes(termo) ||
                servico.motorista.toLowerCase().includes(termo) ||
                servico.numeroFrota.toLowerCase().includes(termo) ||
                servico.local.toLowerCase().includes(termo) ||
                (servico.responsavel && servico.responsavel.toLowerCase().includes(termo)) ||
                (servico.observacao && servico.observacao.toLowerCase().includes(termo))
            );
        });

        this.renderServicos(resultados);
    }

    filtrarPorMotorista(motorista) {
        if (!motorista) {
            this.renderServicos();
            return;
        }

        const resultados = this.servicos.filter(s => s.motorista === motorista);
        this.renderServicos(resultados);
    }

    limparFiltros() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterMotorista').value = '';
        this.renderServicos();
    }

    // Utilitários
    formatarData(data) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    mostrarNotificacao(mensagem, tipo = 'success') {
        // Criar elemento de notificação
        const notificacao = document.createElement('div');
        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        notificacao.textContent = mensagem;

        // Adicionar animação CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notificacao);

        // Remover após 3 segundos
        setTimeout(() => {
            notificacao.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notificacao.remove(), 300);
        }, 3000);
    }
}

// Inicializar aplicativo
const app = new CaminhaoPranchaApp();

// ==========================================
// THREE.JS - PARTÍCULAS 3D NO FUNDO
// ==========================================
function initThreeJS() {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = document.getElementById('threejs-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // Setup da cena com fundo claro
    const scene = new THREE.Scene();
    
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: true 
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    camera.position.z = 50;

    // Criar geometria de partículas
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        // Posições aleatórias
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = (Math.random() - 0.5) * 100;
        positions[i + 2] = (Math.random() - 0.5) * 100;
        
        // Velocidades aleatórias para movimento
        velocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        });
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material das partículas com cor suave
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0x4f46e5, // Cor primária do tema
        size: 0.3,
        transparent: true,
        opacity: 0.4,
       
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Linhas conectando partículas próximas
    const linesMaterial = new THREE.LineBasicMaterial({
        color: 0xec4899, // Cor primária escura
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending
    });

    let linesMesh;

    function createLines() {
        const positions = particlesGeometry.attributes.position.array;
        const linePositions = [];
        const maxDistance = 15;

        for (let i = 0; i < positions.length; i += 3) {
            for (let j = i + 3; j < positions.length; j += 3) {
                const dx = positions[i] - positions[j];
                const dy = positions[i + 1] - positions[j + 1];
                const dz = positions[i + 2] - positions[j + 2];
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < maxDistance) {
                    linePositions.push(positions[i], positions[i + 1], positions[i + 2]);
                    linePositions.push(positions[j], positions[j + 1], positions[j + 2]);
                }
            }
        }

        if (linesMesh) {
            scene.remove(linesMesh);
            linesMesh.geometry.dispose();
        }

        const linesGeometry = new THREE.BufferGeometry();
        linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
        scene.add(linesMesh);
    }

    createLines();

    // Animação
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);

        const positions = particlesGeometry.attributes.position.array;

        // Animar partículas
        for (let i = 0; i < positions.length; i += 3) {
            const velocityIndex = i / 3;
            
            positions[i] += velocities[velocityIndex].x;
            positions[i + 1] += velocities[velocityIndex].y;
            positions[i + 2] += velocities[velocityIndex].z;

            // Bounce nas bordas
            if (Math.abs(positions[i]) > 50) velocities[velocityIndex].x *= -1;
            if (Math.abs(positions[i + 1]) > 50) velocities[velocityIndex].y *= -1;
            if (Math.abs(positions[i + 2]) > 50) velocities[velocityIndex].z *= -1;
        }

        particlesGeometry.attributes.position.needsUpdate = true;

        // Atualizar linhas a cada 60 frames para performance
        if (Math.random() > 0.98) {
            createLines();
        }

        // Rotação suave baseada no mouse
        particlesMesh.rotation.y += 0.001;
        particlesMesh.rotation.x = mouseY * 0.1;
        particlesMesh.rotation.y += mouseX * 0.001;

        if (linesMesh) {
            linesMesh.rotation.copy(particlesMesh.rotation);
        }

        renderer.render(scene, camera);
    }

    animate();

    // Responsividade
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Inicializar Three.js
if (typeof THREE !== 'undefined') {
    initThreeJS();
}

// ==========================================
// GSAP - ANIMAÇÕES AVANÇADAS
// ==========================================

// Animar header ao carregar
if (typeof gsap !== 'undefined') {
    gsap.from('.header', {
        duration: 1,
        y: -100,
        opacity: 0,
        ease: 'power3.out'
    });

    // Animar stats cards com stagger
    gsap.from('.stat-card', {
        duration: 0.8,
        y: 50,
        opacity: 0,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.3
    });

    // Animar filtros
    gsap.from('.filters-section', {
        duration: 0.8,
        y: 30,
        opacity: 0,
        ease: 'power3.out',
        delay: 0.6
    });

    // Animar services section
    gsap.from('.services-section', {
        duration: 0.8,
        y: 30,
        opacity: 0,
        ease: 'power3.out',
        delay: 0.8
    });
}

// Função para animar novos service cards quando adicionados
window.animateServiceCards = function() {
    if (typeof gsap !== 'undefined') {
        const cards = document.querySelectorAll('.service-card');
        
        gsap.from(cards, {
            duration: 0.6,
            y: 30,
            opacity: 0,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'all'
        });

        // Hover effects com GSAP
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                gsap.to(this, {
                    duration: 0.3,
                    y: -8,
                    boxShadow: '0 20px 50px rgba(31, 38, 135, 0.4)',
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', function() {
                gsap.to(this, {
                    duration: 0.3,
                    y: 0,
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
                    ease: 'power2.out'
                });
            });
        });
    }
};
