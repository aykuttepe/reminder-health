import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { parseITSKarekod, ITSParsedData } from '../itsParser';
import { findMedicineByGTIN, CatalogMedicine, TURKISH_MED_CATALOG } from '../data/medCatalog';

import { COLORS, RADII } from '../theme';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(Math.round(SCREEN_WIDTH * 0.72), 340);

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanResult: (result: {
    gtin: string;
    name?: string;
    amount?: string;
    form?: 'tablet' | 'kapsul' | 'damla' | 'surup';
    mealCondition?: 'tok' | 'ac' | 'yemekle' | 'farketmez';
    instructions?: string;
    defaultStock?: number;
    stockThreshold?: number;
    expiryDate?: string;
    batchNo?: string;
    raw: string;
  }) => void;
  learnedMeds?: Record<string, Partial<CatalogMedicine>>;
  serverUrl?: string;
  lang?: 'tr' | 'en';
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  onScanResult,
  learnedMeds,
  serverUrl,
  lang = 'tr',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [showTestPresets, setShowTestPresets] = useState(false);
  const isScanningRef = useRef(false);

  // Modal açıldığında taramayı sıfırla
  React.useEffect(() => {
    if (visible) {
      isScanningRef.current = false;
      setFlash(false);
      setShowTestPresets(false);
    }
  }, [visible]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      Vibration.vibrate([0, 80, 50, 80]);
    } catch {}

    const parsed = parseITSKarekod(data);
    const gtin = parsed ? parsed.gtin : (data.length === 13 ? '0' + data : data);
    const localMed = findMedicineByGTIN(gtin, learnedMeds);

    if (localMed) {
      onScanResult({
        gtin,
        name: localMed.name,
        amount: localMed.amount,
        form: localMed.form,
        mealCondition: localMed.mealCondition,
        instructions: localMed.instructions,
        defaultStock: localMed.defaultStock,
        stockThreshold: localMed.stockThreshold,
        expiryDate: parsed?.expiryDate,
        batchNo: parsed?.batchNo,
        raw: data,
      });
      onClose();
      return;
    }

    // Çevrimdışı katalogda yoksa, yapılandırılmış sunucudan sorgula
    if (serverUrl && serverUrl.trim()) {
      try {
        const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${cleanUrl}/api/catalog/${encodeURIComponent(gtin)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json && json.found) {
            onScanResult({
              gtin,
              name: json.name,
              amount: json.amount,
              form: json.form,
              mealCondition: json.mealCondition,
              instructions: json.instructions,
              defaultStock: json.defaultStock,
              stockThreshold: json.stockThreshold,
              expiryDate: parsed?.expiryDate,
              batchNo: parsed?.batchNo,
              raw: data,
            });
            onClose();
            return;
          }
        }
      } catch {
        // Ağ hatası veya zaman aşımında sessizce devam et
      }
    }

    // Bulunamadıysa kullanıcıya ad girmesi için barkodu ilet
    onScanResult({
      gtin,
      expiryDate: parsed?.expiryDate,
      batchNo: parsed?.batchNo,
      raw: data,
    });
    onClose();
  };

  const handlePresetSelect = (gtin: string, sampleDataMatrix?: string) => {
    const raw = sampleDataMatrix || `(01)${gtin}(21)SERI12345(17)260531(10)PARTI88`;
    handleBarcodeScanned({ data: raw });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Permission Check */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={54} color={COLORS.accent} />
            <Text style={styles.permissionTitle}>
              {lang === 'en' ? 'Camera Permission Required' : 'Kamera İzni Gerekli'}
            </Text>
            <Text style={styles.permissionSub}>
              {lang === 'en'
                ? 'Camera access is required to automatically scan the barcode and expiry date on medication boxes.'
                : 'İlaç kutusundaki karekodu ve son kullanma tarihini otomatik okumak için kameraya erişim izni vermeniz gerekmektedir.'}
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>
                {lang === 'en' ? 'Grant Camera Permission' : 'Kamera İzni Ver'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionCancelBtn} onPress={onClose}>
              <Text style={styles.permissionCancelText}>
                {lang === 'en' ? 'Cancel' : 'Vazgeç'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={flash}
              barcodeScannerSettings={{
                barcodeTypes: ['datamatrix', 'qr', 'ean13', 'code128'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            {/* The app bar is light elsewhere; over the live camera the status icons must be light. */}
            <StatusBar style="light" />

            {/* Dark Mask Around Viewfinder */}
            <View style={styles.overlay}>
              {/* Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose}>
                  <Ionicons name="close" size={24} color={COLORS.onCamera} />
                </TouchableOpacity>

                <View style={styles.headerTitleBox}>
                  <Text style={styles.headerTitle}>
                    {lang === 'en' ? 'SCAN BARCODE / DATA MATRIX' : 'KAREKOD / BARKOD TARA'}
                  </Text>
                  <Text style={styles.headerSub}>
                    {lang === 'en' ? 'ITS DataMatrix & EAN Compatible' : 'ITS DataMatrix & EAN Uyumlu'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconCircleBtn, flash && styles.iconCircleBtnActive]}
                  onPress={() => setFlash(!flash)}
                >
                  <Ionicons name={flash ? 'flashlight' : 'flashlight-outline'} size={20} color={flash ? COLORS.onAccent : COLORS.onCamera} />
                </TouchableOpacity>
              </View>

              {/* Viewfinder Target */}
              <View style={styles.scannerWrapper}>
                <View style={styles.targetFrame}>
                  {/* Corner accents */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Center reticle */}
                  <View style={styles.centerReticle} />
                </View>
                <Text style={styles.scanInstruction}>
                  {lang === 'en'
                    ? 'Align the medication barcode or QR code inside this frame'
                    : 'İlaç kutusundaki karekodu veya barkodu bu çerçevenin içine hizalayın'}
                </Text>
              </View>

              {/* Bottom Quick Test Presets Bar */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.presetsToggleBtn}
                  onPress={() => setShowTestPresets(!showTestPresets)}
                >
                  <Ionicons name="flask-outline" size={16} color={COLORS.onCamera} />
                  <Text style={styles.presetsToggleBtnText}>
                    {showTestPresets
                      ? (lang === 'en' ? 'Hide Sample List' : 'Örnek Listeyi Gizle')
                      : (lang === 'en' ? 'No Box? Try Sample Medication' : 'Kutu Bulunmuyorsa: Örnek İlaç Dene')}
                  </Text>
                  <Ionicons name={showTestPresets ? 'chevron-down' : 'chevron-up'} size={14} color={COLORS.onCamera} />
                </TouchableOpacity>

                {showTestPresets && (
                  <View style={styles.presetsCard}>
                    <Text style={styles.presetsCardTitle}>
                      {lang === 'en' ? 'Sample Medication Barcodes:' : 'Örnek Türkiye İlaç Karekodları:'}
                    </Text>
                    <View style={styles.presetsGrid}>
                      {[
                        { name: 'Prograf 1 mg', gtin: '08699043890338' },
                        { name: 'Warfmadin 5 mg', gtin: '08699809018853' },
                        { name: 'Coraspin 100 mg', gtin: '08699546011122' },
                        { name: 'Parol 500 mg', gtin: '08699508010071' },
                        { name: 'Nexium 40 mg', gtin: '08699786010084' },
                        { name: 'Arveles 25 mg', gtin: '08699514091651' },
                      ].map(item => (
                        <TouchableOpacity
                          key={item.gtin}
                          style={styles.presetChip}
                          onPress={() => handlePresetSelect(item.gtin)}
                        >
                          <Ionicons name="barcode-outline" size={12} color={COLORS.accent} />
                          <Text style={styles.presetChipText}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  permissionSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADII.button,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: COLORS.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionCancelBtn: {
    marginTop: 14,
    padding: 10,
  },
  permissionCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: COLORS.cameraScrim,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 16,
    backgroundColor: COLORS.cameraBar,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.onCamera,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSub: {
    color: COLORS.onCamera,
    fontSize: 11,
    marginTop: 2,
  },
  iconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cameraBar,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cameraBar,
  },
  iconCircleBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  scannerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  centerReticle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },
  scanInstruction: {
    color: COLORS.onCamera,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 36,
    lineHeight: 18,
    textShadowColor: COLORS.textShadowStrong,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  presetsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cameraBar,
    borderWidth: 1,
    borderColor: COLORS.cameraBar,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADII.button,
  },
  presetsToggleBtnText: {
    color: COLORS.onCamera,
    fontSize: 12,
    fontWeight: '700',
  },
  presetsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.card,
    padding: 12,
    marginTop: 8,
  },
  presetsCardTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  presetChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
