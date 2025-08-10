import { useMemo } from 'react';
import { useStore } from '@xyflow/react';

// Ordem fixa das seções no monitor estruturado
const SECTION_ORDER = ['Introdução', 'Corpo', 'Conclusão'];

// Identifica se um node é uma seção principal
function isSectionNode(node) {
  if (!node) return false;
  const title = node?.data?.title;
  const id = node?.id;
  const coreKey = node?.data?.coreKey;

  // Critérios aceitos no projeto atual
  if (id === 'summary' || id === 'body' || id === 'conclusion') return true;
  if (SECTION_ORDER.includes(title)) return true;
  if (coreKey === 'Introduce' || coreKey === 'corpos_de_analise' || coreKey === 'conclusoes') return true;
  return false;
}

// Normaliza para ordenação estável por label
function normalizeLabel(value) {
  return (value ?? '').toString().toLowerCase();
}

const selectGraph = (s) => ({ nodes: s.nodes, edges: s.edges });

export function useMonitorHierarchy() {
  const { nodes, edges } = useStore(selectGraph);

  return useMemo(() => {

    if (!nodes?.length) return [];

    // Mapas auxiliares
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const parents = nodes.filter(isSectionNode);
    const parentById = new Map(parents.map((p) => [p.id, p]));

    // Inicializa agrupamento filhos -> pai (lembrando: edge source = filho, target = pai)
    const childrenByParent = new Map();
    parents.forEach((p) => childrenByParent.set(p.id, []));

    // Distribui filhos por pai, apenas quando o target é uma seção conhecida
    edges.forEach((e) => {
      if (!e?.source || !e?.target) return;
      if (!parentById.has(e.target)) return;
      const child = nodeById.get(e.source);
      const parent = parentById.get(e.target);
      if (!child || !parent) return;
      // Evitar incluir o próprio pai, monitor ou duplicatas
      if (isSectionNode(child)) return;
      if (child.type === 'monitorNode') return;

      const list = childrenByParent.get(parent.id);
      if (!list.find((n) => n.id === child.id)) list.push(child);
    });

    // Ordena pais pela ordem fixa (fallback mantém ordem original)
    const orderedParents = [...parents].sort((a, b) => {
      const at = a?.data?.title ?? '';
      const bt = b?.data?.title ?? '';
      const ai = SECTION_ORDER.indexOf(at);
      const bi = SECTION_ORDER.indexOf(bt);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    // Ordena filhos por label/title
    orderedParents.forEach((p) => {
      const arr = childrenByParent.get(p.id) || [];
      arr.sort((a, b) =>
        normalizeLabel(a?.data?.title || a?.data?.label || a?.data?.name || a?.id).localeCompare(
          normalizeLabel(b?.data?.title || b?.data?.label || b?.data?.name || b?.id)
        )
      );
      childrenByParent.set(p.id, arr);
    });

    // Estrutura final
    return orderedParents.map((p) => ({ parent: p, children: childrenByParent.get(p.id) || [] }));
  }, [nodes, edges]);
}


