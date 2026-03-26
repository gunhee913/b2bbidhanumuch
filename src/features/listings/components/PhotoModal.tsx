'use client';

import React, { useState, useRef, useCallback } from 'react';
import { X, Printer, Plus, Trash2, ImageIcon, Upload } from 'lucide-react';
import { CertificateData } from '@/features/listings/types';

export interface PhotoModalData {
  id: string;
  auctionNo: string;
  company?: string;
  grade: string;
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
}

interface PhotoModalProps {
  data: PhotoModalData;
  editable?: boolean;
  onClose: () => void;
  onSave?: (updates: {
    images?: string[];
    slaughterCert?: CertificateData | null;
    gradeCert?: CertificateData | null;
  }) => Promise<void>;
}

export default function PhotoModal({ data, editable = false, onClose, onSave }: PhotoModalProps) {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editImages, setEditImages] = useState<string[]>(data.images);
  const [editSlaughterCert, setEditSlaughterCert] = useState<CertificateData | null>(data.slaughterCert);
  const [editGradeCert, setEditGradeCert] = useState<CertificateData | null>(data.gradeCert);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const slaughterCertInputRef = useRef<HTMLInputElement>(null);
  const gradeCertInputRef = useRef<HTMLInputElement>(null);

  const images = isEditing ? editImages : data.images;
  const slaughterCert = isEditing ? editSlaughterCert : data.slaughterCert;
  const gradeCert = isEditing ? editGradeCert : data.gradeCert;

  const subtitle = data.company
    ? `접수번호: ${data.auctionNo} | ${data.company} | ${data.grade}`
    : `접수번호: ${data.auctionNo} | ${data.grade}`;

  const startEditing = () => {
    setEditImages([...data.images]);
    setEditSlaughterCert(data.slaughterCert);
    setEditGradeCert(data.gradeCert);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditImages(data.images);
    setEditSlaughterCert(data.slaughterCert);
    setEditGradeCert(data.gradeCert);
  };

  const uploadImages = useCallback(async (files: FileList): Promise<string[]> => {
    const base64Promises = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    const base64Images = await Promise.all(base64Promises);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: base64Images, folder: 'listings' }),
    });

    if (!res.ok) throw new Error('업로드 실패');
    const result = await res.json();
    return result.urls;
  }, []);

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await uploadImages(files);
      setEditImages((prev) => [...prev, ...urls]);
    } catch {
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCertUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'slaughter' | 'grade'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const urls = await uploadImages(Object.assign([file], { length: 1, item: () => file }) as unknown as FileList);
      const url = urls[0];
      if (!url) return;

      const certData: CertificateData = { fileName: file.name, fileData: url, fileType: file.type };
      if (type === 'slaughter') setEditSlaughterCert(certData);
      else setEditGradeCert(certData);
    } catch {
      alert('증명서 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (type === 'slaughter' && slaughterCertInputRef.current) slaughterCertInputRef.current.value = '';
      if (type === 'grade' && gradeCertInputRef.current) gradeCertInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({
        images: editImages,
        slaughterCert: editSlaughterCert,
        gradeCert: editGradeCert,
      });
      setIsEditing(false);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">상장 사진 / 증명서</h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 본문 */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-130px)]">
            {/* 상장 사진 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">상장 사진</h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {isUploading ? '업로드 중...' : '사진 추가'}
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddImages}
                />
              </div>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <p className="text-xs font-medium text-gray-600 text-center mb-1">사진 {index + 1}</p>
                      <div
                        className="relative cursor-pointer overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors"
                        onClick={() => !isEditing && setEnlargedImage(img)}
                      >
                        <img
                          src={img}
                          alt={`사진 ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        {isEditing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-300 bg-gray-50">
                  <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">등록된 사진이 없습니다.</p>
                </div>
              )}
            </div>

            {/* 증명서 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">증명서</h4>
              <div className="grid grid-cols-2 gap-6">
                {/* 도축검사증명서 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">도축검사증명서</p>
                    {isEditing && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => slaughterCertInputRef.current?.click()}
                          disabled={isUploading}
                          className="text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {slaughterCert ? '교체' : '등록'}
                        </button>
                        {slaughterCert && (
                          <button
                            type="button"
                            onClick={() => setEditSlaughterCert(null)}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={slaughterCertInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCertUpload(e, 'slaughter')}
                  />
                  {slaughterCert?.fileData ? (
                    <div
                      className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                      style={{ aspectRatio: '210/297' }}
                      onClick={() => setEnlargedImage(slaughterCert.fileData)}
                    >
                      <img
                        src={slaughterCert.fileData}
                        alt="도축검사증명서"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                      style={{ aspectRatio: '210/297' }}
                    >
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => slaughterCertInputRef.current?.click()}
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px]">업로드</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">미등록</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 등급판정확인서 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">등급판정확인서</p>
                    {isEditing && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => gradeCertInputRef.current?.click()}
                          disabled={isUploading}
                          className="text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {gradeCert ? '교체' : '등록'}
                        </button>
                        {gradeCert && (
                          <button
                            type="button"
                            onClick={() => setEditGradeCert(null)}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={gradeCertInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCertUpload(e, 'grade')}
                  />
                  {gradeCert?.fileData ? (
                    <div
                      className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                      style={{ aspectRatio: '210/297' }}
                      onClick={() => setEnlargedImage(gradeCert.fileData)}
                    >
                      <img
                        src={gradeCert.fileData}
                        alt="등급판정확인서"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                      style={{ aspectRatio: '210/297' }}
                    >
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => gradeCertInputRef.current?.click()}
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-500"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px]">업로드</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">미등록</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="p-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              {isUploading && (
                <span className="text-xs text-blue-500">업로드 중...</span>
              )}
            </div>
            <div className="flex gap-2">
              {editable && !isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  수정
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </>
              )}
              {!isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 확대 이미지 모달 */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative mx-4 max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage}
              alt="확대 이미지"
              className="max-w-full max-h-[90vh] object-contain bg-white shadow-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>인쇄</title>
                        <style>
                          @page { size: A4; margin: 10mm; }
                          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                          img { max-width: 100%; max-height: 100%; object-fit: contain; }
                        </style>
                      </head>
                      <body>
                        <img src="${enlargedImage}" />
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.onload = () => {
                    printWindow.print();
                    printWindow.close();
                  };
                }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-lg"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
