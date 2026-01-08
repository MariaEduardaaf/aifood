# 🧠 BRAIN — Plataforma de Atendimento Inteligente para Restaurantes

> **Última atualização:** 2026-01-08

## Status de Implementação

| Fase | Status | Observação |
|------|--------|------------|
| MVP (Chamados) | ✅ Completo | Funcionando 100% |
| Fase 1.5 (Google Reviews) | ✅ Completo | Avaliação inteligente funcionando |
| Fase 2 (Cardápio Digital) | ✅ Completo | Menu trilíngue com fotos |
| Fase 3 (Pedidos) | ✅ Completo | Carrinho e acompanhamento |
| Fase 4 (Cozinha) | ✅ Completo | Painel Kanban funcionando |
| Deploy Produção | ⏳ Pendente | Aguardando configuração |

---

## 1. Visão Geral

Esta aplicação é uma **plataforma de operação e atendimento para restaurantes**, criada para resolver um problema muito comum (especialmente na Europa):

> ❌ Atendimento lento
> ❌ Garçons sobrecarregados
> ❌ Clientes frustrados
> ❌ Reviews ruins no Google
> ❌ Falta de métricas reais de atendimento

A solução começa **simples**, validando o problema com um **Web MVP**, e evolui para um **ecossistema completo**, com múltiplos perfis (cliente, garçom, cozinha e admin), operação em tempo real, métricas e reputação online.

---

## 2. Princípios do Produto

Esses princípios **não devem ser quebrados**, nem no MVP nem no futuro:

1. **Zero fricção para o cliente**

   * Cliente nunca cria conta
   * Tudo começa pelo QR Code

2. **Simplicidade extrema para o staff**

   * Garçom vê só o que precisa
   * Poucos cliques, sem distração

3. **Tempo real é obrigatório**

   * Chamado atrasado = produto falhou

4. **Dados antes de features**

   * Cada ação gera métrica
   * Métricas vendem o produto

5. **Evolução por fases**

   * MVP resolve 1 dor
   * Pós-MVP cria diferenciação

---

## 3. Problema que o produto resolve

### Para o cliente

* Espera longa para ser atendido
* Dificuldade para pedir a conta
* Barreiras de idioma
* Sensação de abandono

### Para o restaurante

* Garçons não veem todos os clientes
* Falta de organização
* Nenhuma métrica de atendimento
* Reviews negativas no Google sem controle

---

## 4. Visão do Sistema (macro)

A aplicação é **um único sistema**, com **um backend central**, mas com **interfaces diferentes dependendo do login (role)**.

### Roles do sistema

* **CLIENT (público)** → sem login
* **WAITER** → login email/senha
* **KITCHEN** → login email/senha
* **ADMIN / MANAGER** → login email/senha
* **SUPER_ADMIN** (futuro)

---

## 5. Fase 1 — MVP Web (escopo fechado)

### Objetivo do MVP

Validar que:

* QR Code é usado
* Garçom responde mais rápido
* Restaurante vê valor real
* Produto é simples o suficiente para adoção

### Escopo do MVP

👉 **Apenas 1 restaurante**
👉 **Apenas Web**
👉 **Sem pedidos**
👉 **Sem cardápio**
👉 **Sem pagamento**

---

## 6. Funcionalidades do MVP

### 6.1 Cliente (SEM login)

**Acesso**

* Via QR Code fixado na mesa

**Página da Mesa**

* Identificação da mesa (ex: "Mesa 13")
* Botões:

  * ✅ Chamar garçom
  * ✅ Pedir a conta

**Idiomas suportados (MVP)**

* Português
* Espanhol
* Inglês

**Comportamento**

* Ao clicar:

  * Cria um "chamado"
  * Mostra confirmação
  * Entra em estado "aguardando"

**Regras**

* Sem cadastro
* Sem cookies obrigatórios
* QR define tudo (mesa + restaurante)

---

### 6.2 Garçom (login email + senha)

**Tela principal: Chamados**

* Lista de chamados abertos
* Ordenado por tempo (mais antigo primeiro)
* Cada item mostra:

  * Mesa
  * Tipo (garçom / conta)
  * Tempo em aberto

**Ações**

* Marcar chamado como resolvido

**UX obrigatória**

* Interface limpa
* Pensada para celular
* Sons/alertas visuais

---

### 6.3 Admin / Gerente (mínimo)

**Funções**

* Criar mesas
* Gerar QR Code por mesa
* Criar usuários (garçons)
* Ver métricas simples

**Métricas**

* Total de chamados
* Tempo médio de resposta
* Chamados por horário

---

## 7. O que NÃO entrava no MVP (já implementado pós-MVP)

* ✅ ~~Cardápio~~ → **Implementado na Fase 2**
* ✅ ~~Pedido pelo app~~ → **Implementado na Fase 3**
* ✅ ~~Cozinha~~ → **Implementado na Fase 4**
* ❌ IA → Futuro
* ❌ Ranking → Futuro
* ✅ ~~Google Reviews automático~~ → **Implementado na Fase 1.5**
* ❌ Multi-restaurante → Futuro
* ❌ Tradução para outros idiomas (além de PT/ES/EN) → Futuro

Essas features foram implementadas **após validação do MVP**.

---

## 8. Entidade central do sistema: CHAMADO

Tudo no MVP gira em torno do **chamado**.

### Estrutura lógica do chamado

* Mesa
* Tipo
* Status
* Tempo

### Tipos

* `CALL_WAITER`
* `REQUEST_BILL`

### Status

* `OPEN`
* `RESOLVED`

Cada chamado **gera dados**:

* quanto demorou
* quem resolveu
* em qual horário

---

## 9. Fluxos principais

### Fluxo: Chamar garçom

1. Cliente escaneia QR
2. Clica "Chamar garçom"
3. Backend cria chamado
4. Garçom recebe em tempo real
5. Garçom atende
6. Marca como resolvido
7. Sistema registra tempo

### Fluxo: Pedir conta

Mesmo fluxo, tipo diferente.

---

## 10. Tempo real (essencial)

* Backend emite eventos
* Painel do garçom mantém conexão ativa
* Atualizações sem refresh

Sem tempo real → **produto perde valor**

---

## 11. Segurança e limites

### MVP

* Rate limit por mesa (ex: 1 chamado a cada 30s)
* QR token longo e imprevisível
* Login protegido por hash de senha
* Separação clara de permissões

---

## 12. Estrutura de dados (conceitual)

### tables

* id
* label
* qr_token

### users

* id
* email
* password_hash
* role

### calls

* id
* table_id
* type
* status
* created_at
* resolved_at

---

## 13. Pós-MVP — Evolução do Produto

Após validar o MVP, o produto evolui para uma **plataforma completa**.

### Novas áreas

#### Cliente

* Cardápio digital
* Pedido no app
* Tradução automática
* IA de sugestão de pratos
* Avaliação pós-visita

#### Garçom

* Comandas
* Status de pedidos
* Comunicação com cozinha

#### Cozinha

* Fila de preparo
* Status
* Notificação para garçom

#### Admin

* Métricas avançadas
* Ranking
* Configuração Google Reviews
* Performance por funcionário

---

## 14. Google Reviews (fase 1.5 / pós-MVP)

Lógica:

* Cliente pede conta
* Sistema pergunta: "Como foi o atendimento?"

  * Nota alta → redireciona para Google Reviews
  * Nota baixa → feedback privado

Objetivo:

* Melhorar reputação
* Reduzir reviews negativas públicas

---

## 15. Ranking e reputação

Ranking baseado em:

* Tempo médio de atendimento
* SLA (ex: % atendido < 3 min)
* Feedback positivo
* (opcional) Google rating

---

## 16. Monetização (futuro)

* Assinatura mensal por restaurante
* Planos baseados em:

  * número de mesas
  * número de funcionários
  * métricas avançadas
  * IA / ranking

---

## 17. Estratégia de validação

1. Restaurantes pequenos
2. Uso gratuito
3. QR simples em papel
4. 1–2 semanas de teste
5. Coletar dados
6. Ajustar UX
7. Transformar em plano pago

---

## 18. Riscos e como mitigar

| Risco                | Solução                |
| -------------------- | ---------------------- |
| Garçom ignora painel | Alertas + simplicidade |
| Cliente spamma QR    | Rate limit             |
| Internet ruim        | Reconnect automático   |
| Dono não vê valor    | Mostrar métricas       |

---

## 19. Definição clara do MVP

> **Se isso não funcionar, nada mais importa.**

* Cliente chama
* Garçom vê
* Garçom responde
* Tempo é medido

---

## 20. Filosofia final

Este produto **não é um app bonito**.
É uma **ferramenta operacional**, feita para:

* reduzir espera
* melhorar experiência
* gerar dados reais
* aumentar reputação
