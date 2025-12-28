!macro customInstall
  ; Ensure Start Menu shortcut uses our icon (even if the EXE icon can't be resource-patched).
  CreateDirectory "$SMPROGRAMS\\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\\${PRODUCT_NAME}\\${PRODUCT_NAME}.lnk" "$INSTDIR\\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\\resources\\icon.ico" 0

  ; Desktop shortcut with our icon (fixes "React/Electron icon" look when launched normally).
  CreateShortCut "$DESKTOP\\${PRODUCT_NAME}.lnk" "$INSTDIR\\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\\resources\\icon.ico" 0
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\\${PRODUCT_NAME}\\${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\\${PRODUCT_NAME}"

  Delete "$DESKTOP\\${PRODUCT_NAME}.lnk"
!macroend


