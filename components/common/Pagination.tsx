'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  currentItemsCount?: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  currentItemsCount,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(211, 47, 47, 0.2)',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ color: '#CBD5E1', fontSize: '0.9rem' }}>
        Affichage de {startItem} à {endItem} sur {totalItems} résultat{totalItems > 1 ? 's' : ''}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            padding: '8px 12px',
            background: currentPage === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(211, 47, 47, 0.2)',
            color: currentPage === 1 ? '#718096' : '#fff',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            borderRadius: '8px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          ««
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '8px 12px',
            background: currentPage === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(211, 47, 47, 0.2)',
            color: currentPage === 1 ? '#718096' : '#fff',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            borderRadius: '8px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          ‹
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} style={{ padding: '8px', color: '#CBD5E1' }}>
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              style={{
                padding: '8px 12px',
                background: isActive
                  ? 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: isActive ? '#fff' : '#CBD5E1',
                border: `1px solid ${isActive ? '#d32f2f' : 'rgba(211, 47, 47, 0.3)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isActive ? '700' : '600',
                minWidth: '40px',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 12px',
            background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.1)' : 'rgba(211, 47, 47, 0.2)',
            color: currentPage === totalPages ? '#718096' : '#fff',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            borderRadius: '8px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          ›
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 12px',
            background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.1)' : 'rgba(211, 47, 47, 0.2)',
            color: currentPage === totalPages ? '#718096' : '#fff',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            borderRadius: '8px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          »»
        </button>
      </div>
    </div>
  );
};

export default Pagination;

