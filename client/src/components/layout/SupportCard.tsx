import { Headset } from 'lucide-react';

import { useToast } from '@/components/ui/ToastHost';

export default function SupportCard() {
  const { showToast } = useToast();
  return (
    <div
      style={{
        margin: 12,
        padding: 12,
        borderRadius: 10,
        background: 'linear-gradient(160deg, #023020, #04552B)',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Need Help?</div>
      <div
        style={{
          fontSize: 11,
          color: '#BFE6CC',
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#3DDC84',
            boxShadow: '0 0 0 3px rgba(61, 220, 132, 0.2)',
            flexShrink: 0,
          }}
        />
        Support team is online
      </div>
      <button
        type="button"
        onClick={() => showToast('Connecting you to the support team…', 'info')}
        style={{
          width: '100%',
          marginTop: 10,
          background: '#fff',
          color: '#04552B',
          border: 'none',
          borderRadius: 8,
          padding: 7,
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.22)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Headset size={15} />
        Contact Support
      </button>
    </div>
  );
}
