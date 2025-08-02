# Style Guide - Projeto LiNA

## 1. Filosofia de Design

- **Eficiência e Foco:** A interface não deve distrair. Cada elemento visual existe para guiar o usuário e facilitar a leitura, análise e edição de conteúdo. A informação é a protagonista.
- **Clareza Hierárquica:** O usuário precisa identificar instantaneamente o que é um título, o que é um corpo de texto, o que é um metadado e o que é uma ação clicável.
- **Consistência é Confiança:** O uso rigoroso deste guia garantirá que a experiência do usuário seja previsível e profissional em toda a plataforma.

## 2. Paleta de Cores (Dark Mode Padrão)

| Uso | Cor (Nome) | HEX | RGB | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| Fundo Principal | Primary Background | `#121212` | 18, 18, 18 | Fundo da página e da área de conteúdo. |
| Fundo Secundário | Secondary Background | `#1E1E1E` | 30, 30, 30 | Sidebars, cards, modais. |
| Texto Principal | Text Primary | `#E0E0E0` | 224, 224, 224 | Títulos e corpo de texto. |
| Texto Secundário | Text Secondary/Muted | `#A0A0A0` | 160, 160, 160 | Metadados, timestamps, placeholders. |
| **Destaque/Ação** | **Accent/Highlight** | **`#2BB24C`** | 43, 178, 76 | Ações principais: botões, links, seleções. |
| Hover/Ativo | Hover/Active | `#2BB24C33` | 43, 178, 76 (20%) | Tonalidade verde sutil para feedback. |
| Divisores/Bordas | Borders/Dividers | `#333333` | 51, 51, 51 | Linhas e separadores de cartões. |
| Ícones | Icons | `#FFFFFF` | 255, 255, 255 | Ícones padrão. Usar Accent para estado ativo. |
| Sombras | Shadows | `rgba(0,0,0,0.3)` | - | Elevação sutil para modais e pop-ups. |

## 3. Tipografia

- **Família de Fontes:** `Inter`
- **Escala Tipográfica:**

| Elemento | `font-weight` | `font-size` | Cor (Token) | Uso |
| :--- | :--- | :--- | :--- | :--- |
| Título Principal (H1) | `Bold (700)` | `24px` | Text Primary | Título principal da página. |
| Título de Seção (H2) | `SemiBold (600)` | `18px` | Text Primary | Títulos de seções principais. |
| Título de Card (H3) | `Medium (500)` | `16px` | Text Primary | Títulos em cards e listas. |
| Corpo do Texto | `Regular (400)` | `14px` | Text Primary | Texto principal no editor, parágrafos. |
| Subtítulo/Metadado | `Regular (400)` | `12px` | Text Secondary | Timestamps, fontes, labels. |
| Botões e Links | `Medium (500)` | `14px` | Accent | Ações clicáveis. |

## 4. Espaçamento e Layout

- **Grade Base:** Múltiplos de **8px** para todos os `margins` e `paddings` (8, 16, 24, 32px...).
- **Paddings Padrão:**
  - Cards e Inputs: `12px`.
  - Seções Principais: `24px`.
- **Border Radius:** `8px` para cards e inputs; `6px` para botões.

## 5. Iconografia

- **Estilo:** `Outline` (Contorno).
- **Biblioteca Recomendada:** `Lucide Icons` (lucide.dev).
- **Tamanho Padrão:** `18px`.
- **Cor:** `Icons` (`#FFFFFF`) por padrão, `Accent` (`#2BB24C`) para estados ativos/selecionados.

## 6. Componentes e Interatividade

- **Botão Primário:** Fundo `Accent`, texto `white`.
- **Botão Secundário:** Fundo `Secondary Background`, borda `Borders/Dividers`. Em hover, fundo `Hover/Active`.
- **Inputs:** Fundo `Secondary Background`, borda `Borders/Dividers`. Em `:focus`, a borda usa a cor `Accent`.
- **Hover em Listas:** Itens de lista (ex: lista de notícias) devem usar `Hover/Active` como cor de fundo ao passar o mouse.