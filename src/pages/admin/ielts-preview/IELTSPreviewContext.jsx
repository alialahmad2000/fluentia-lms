import React, { createContext, useContext } from 'react';

const IELTSPreviewContext = createContext(null);

export function IELTSPreviewProvider({ children }) {
  const value = {
    previewMode: true,
    isAdminPreview: true,
    mockStudent: {
      target_band: 7.0,
      exam_date: null,
      current_week: 1,
    },
  };
  return (
    <IELTSPreviewContext.Provider value={value}>
      {children}
    </IELTSPreviewContext.Provider>
  );
}

export function useIELTSPreview() {
  return useContext(IELTSPreviewContext);
}
