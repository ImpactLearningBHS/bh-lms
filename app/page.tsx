'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      window.location.href = '/reset-password' + hash;
    } else {
      window.location.href = '/login';
    }
  }, []);

  return null;
}