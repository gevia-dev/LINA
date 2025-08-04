import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'nao_processado':
        return {
          backgroundColor: '#6B728020', // gray
          color: '#A0A0A0' // text-secondary
        };
      case 'approved':
        return {
          backgroundColor: '#10B98120', // green-500/20
          color: '#10B981' // green-400
        };
      case 'rejected':
        return {
          backgroundColor: '#EF444420', // red-500/20
          color: '#EF4444' // red-400
        };
      case 'pending':
        return {
          backgroundColor: '#F59E0B20', // yellow/20
          color: '#F59E0B' // yellow
        };
      case 'in_progress':
        return {
          backgroundColor: '#3B82F620', // blue/20
          color: '#3B82F6' // blue
        };
      default:
        return {
          backgroundColor: '#6B728020', // gray
          color: '#A0A0A0' // text-secondary
        };
    }
  };

  const styles = getStatusStyles(status);

  return (
    <div
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: 'Inter',
        fontSize: '12px', // Subtítulo/Metadado do style guide
        fontWeight: '500', // Medium (500)
        padding: '4px 8px', // Espaçamento baseado em 8px
        borderRadius: '6px' // 6px para botões do style guide
      }}
    >
      {status || 'N/A'}
    </div>
  );
};

export default StatusBadge;