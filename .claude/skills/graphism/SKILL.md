---
name: graphism
description: Engenharia matemática de fluidos e sistemas de partículas de alta performance em Canvas 2D/WebGL — object pooling, delta time, anti-memory-leak, devicePixelRatio e 60 FPS estáveis. Use ao criar ou alterar qualquer grafismo interativo, animação de partículas, canvas ou efeito visual em tempo real no apps/web.
---

# Skill: Engenharia Matemática de Fluidos e Sistemas de Partículas de Alta Performance

## 🎯 Propósito
Esta skill força o agente de IA a agir como um Desenvolvedor Gráfico Sênior (Creative Dev). O objetivo é gerar códigos de grafismo interativo (Canvas 2D/WebGL) matematicamente perfeitos, focados em renderização em tempo real estável a 60 FPS, eliminando travamentos, gargalos de CPU e memory leaks.

## 🛠️ Regras Técnicas de Ouro contra Erros Comuns

### 1. Gestão de Memória (Anti-Memory Leak)
- **Proibido dar `new` dentro do Loop de Animação:** Nunca instancie novos objetos, vetores ou partículas dentro da função de renderização/requestAnimationFrame. Isso ativa o Garbage Collector e causa microstuttering (engasgos na tela).
- **Object Pooling Mandatório:** Implemente uma estrutura de "Pool de Objetos". Crie um array fixo de partículas no início. Quando uma partícula "morrer", resete seus atributos (opacidade, posição) e reutilize-a em vez de excluí-la e criar outra.

### 2. Otimização do Canvas 2D / WebGL
- **Cálculo de Delta Time (dt):** Toda física (velocidade, gravidade, dissipação) deve ser multiplicada pelo `deltaTime` (tempo real decorrido entre frames) para que a velocidade da fumaça/explosão seja idêntica em telas de 60Hz, 120Hz ou 144Hz.
- **Redução do ClearRect:** Em simulações de fumaça e rastros, limpe a tela desenhando um retângulo semi-transparente sobre o frame anterior (`ctx.fillStyle = 'rgba(0,0,0,0.05)'`) para criar o efeito natural de rastro (fade-out blur) sem processamento extra.
- **Evitar Redimensionamento Dinâmico:** O tamanho do Canvas deve ser definido via atributos de hardware (`canvas.width` e `canvas.height`) correspondentes ao `devicePixelRatio` da tela para evitar borrões em telas Retina/4K.

## 📐 Padrão Arquitetural Exigido (Física e Matemática)

Toda simulação gerada por esta skill deve seguir rigorosamente a estrutura vetorial e a física de dissipação abaixo:

```javascript
// Estrutura Base de Partícula Otimizada (Object Pool Ready)
class Particle {
  constructor() {
    this.reset(0, 0);
  }
  
  reset(x, y) {
    this.x = x;
    this.y = y;
    // Física Base: Ângulo aleatório + Velocidade explosiva
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.alpha = 1;
    // Taxa de dissipação orgânica (Fumaça)
    this.decay = Math.random() * 0.015 + 0.005; 
    this.size = Math.random() * 4 + 1;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    // Aplicação de atrito/fricção para desaceleração suave
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    // Atualização de posição baseada no tempo
    this.x += this.vx * (dt * 60);
    this.y += this.vy * (dt * 60);
    
    // Sumiço gradativo (Fade out)
    this.alpha -= this.decay * (dt * 60);
    if (this.alpha <= 0) {
      this.active = false; // Retorna ao Pool de Objetos
    }
  }
}
```

## 📋 Fluxo de Trabalho de Geração (Workflow)
Quando o usuário pedir um efeito interativo com o mouse, siga estes passos:
1. **Escolha da Stack:** Se o pedido exigir menos de 5.000 partículas, use Canvas 2D nativo bem estruturado. Se exigir fluidos realistas volumétricos gasosos (Fumaça fluida realista), adote imediatamente Shaders WebGL baseados nas equações de Navier-Stokes.
2. **Definição Matemática:** Explique em 1 frase qual força física está controlando o movimento (ex: Atrito, Gravidade Centralizada, Ruído de Perlin para turbulência).
3. **Entrega de Código Autossuficiente:** Entregue um arquivo único ou componente limpo, contendo o tratamento correto de eventos (`mousemove`, `touchmove`, `resize`) e o loop de renderização protegido por `requestAnimationFrame`.