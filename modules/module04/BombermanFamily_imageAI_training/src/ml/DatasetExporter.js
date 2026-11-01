import { logger } from '../core/Logger.js';

export class DatasetExporter {
  /**
   * Converte as detecções YOLO atuais em formato de anotação de dataset (YOLOv8 .txt)
   * e captura a tela da arena em .png, preparando para download em training/datasets/
   */
  static exportFrameDataset(renderer, detections) {
    logger.log('DATASET', 'Gerando par de arquivos de treinamento YOLO (.png + .txt)...');

    // 1. Captura o frame do canvas do PixiJS em base64 PNG
    const dataUrl = renderer.extract.canvas().toDataURL('image/png');

    // 2. Cria o conteúdo do arquivo .txt com as Bounding Boxes normalizadas do YOLO
    // Formato YOLO: <class_id> <x_center> <y_center> <width> <height>
    const txtLines = detections.map(d => `${d.classId} ${d.cx} ${d.cy} ${d.w} ${d.h}`);
    const txtContent = txtLines.join('\n');

    const timestamp = Date.now();
    const baseName = `bomberman_frame_${timestamp}`;

    // 3. Dispara o download automático da Imagem
    this.downloadFile(dataUrl, `${baseName}.png`, 'image/png');

    // 4. Dispara o download automático do Arquivo de Rótulos (.txt)
    const txtBlob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const txtUrl = URL.createObjectURL(txtBlob);
    this.downloadFile(txtUrl, `${baseName}.txt`, 'text/plain');

    logger.log('DATASET', `✅ Dataset exportado com sucesso para a pasta de downloads! (${baseName}.png + ${baseName}.txt)`);
  }

  static downloadFile(url, filename, mimeType) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (mimeType === 'text/plain') {
      URL.revokeObjectURL(url);
    }
  }
}
