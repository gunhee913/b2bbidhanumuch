'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Home as HomeIcon,
  BarChart3,
  FileText,
  User,
  Gavel,
  ChevronLeft,
  Search,
  Plus,
  X,
  Phone,
  MapPin,
  Building2,
  Mail,
  Truck,
  UserCircle,
  Briefcase,
  Paperclip,
  FileText as FileIcon,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDealerStore, type Dealer } from '@/features/dealers/store';

// 첨부파일 타입
interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

export default function DealersPage() {
  const searchParams = useSearchParams();
  const fromPage = searchParams.get('from');
  const backLink = fromPage === 'profile' ? '/profile' : '/trade';
  
  // 거래처 목록 (Zustand 스토어에서 관리)
  const { dealers, addDealer, updateDealer } = useDealerStore();

  // 검색어
  const [searchQuery, setSearchQuery] = useState('');
  
  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeliveryEditModal, setShowDeliveryEditModal] = useState(false);
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    businessNo: '',
    representative: '',
    businessType: '',
    businessCategory: '',
    managerName: '',
    managerContact: '',
    managerEmail: '',
    deliveryAddress: ''
  });

  // 첨부파일 상태
  const [businessLicenseFile, setBusinessLicenseFile] = useState<AttachedFile | null>(null);
  const [reportCertificateFile, setReportCertificateFile] = useState<AttachedFile | null>(null);

  // 동적 viewport 높이 설정
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // 검색 필터링
  const filteredDealers = useMemo(() => {
    if (!searchQuery) return dealers;
    const query = searchQuery.toLowerCase();
    return dealers.filter(dealer => 
      dealer.name.toLowerCase().includes(query) ||
      dealer.contact.includes(query) ||
      dealer.address.toLowerCase().includes(query)
    );
  }, [dealers, searchQuery]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      address: '',
      businessNo: '',
      representative: '',
      businessType: '',
      businessCategory: '',
      managerName: '',
      managerContact: '',
      managerEmail: '',
      deliveryAddress: ''
    });
    setBusinessLicenseFile(null);
    setReportCertificateFile(null);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<AttachedFile | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile({
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 거래처 등록 신청
  const handleAdd = () => {
    if (!formData.name || !formData.contact || !formData.businessNo) return;
    
    addDealer({
      name: formData.name,
      contact: formData.contact,
      address: formData.address,
      businessNo: formData.businessNo,
      representative: formData.representative,
      businessType: formData.businessType,
      businessCategory: formData.businessCategory,
      managerName: formData.managerName,
      managerContact: formData.managerContact,
      managerEmail: formData.managerEmail,
      deliveryAddress: formData.deliveryAddress,
      businessLicense: businessLicenseFile || undefined,
      reportCertificate: reportCertificateFile || undefined,
    });
    
    setShowAddModal(false);
    setShowSuccessModal(true);
    resetForm();
  };

  // 상세 모달 열기
  const openDetailModal = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setShowDetailModal(true);
  };

  // 배송지 수정 모달 열기
  const openDeliveryEditModal = () => {
    if (selectedDealer) {
      setEditDeliveryAddress(selectedDealer.deliveryAddress || selectedDealer.address || '');
      setShowDeliveryEditModal(true);
    }
  };

  // 배송지 수정 저장
  const handleDeliveryEdit = () => {
    if (!selectedDealer) return;
    
    updateDealer(selectedDealer.id, { deliveryAddress: editDeliveryAddress });
    
    // selectedDealer도 업데이트
    setSelectedDealer(prev => prev ? { ...prev, deliveryAddress: editDeliveryAddress } : null);
    setShowDeliveryEditModal(false);
  };

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div 
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col" 
          style={{
            height: 'calc(var(--vh, 1vh) * 100)',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          <style jsx global>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        
          {/* 모바일 메인 헤더 */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 pt-1 md:pt-0">
          <div className="px-2 md:px-4 py-2">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center">
                <img 
                  src="/Mainlogo.png" 
                  alt="HanuMuch" 
                  className="h-8 w-auto"
                />
              </Link>
              <div className="flex items-center space-x-3">
                <img 
                  src="/음성축산물공판장.png" 
                  alt="음성축산물공판장" 
                  className="h-5 w-auto border border-gray-300 rounded px-1 py-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 페이지 제목 */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={backLink}>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">거래처 관리</h1>
                <p className="text-xs text-gray-500 mt-0.5">총 {filteredDealers.length}개 거래처</p>
              </div>
            </div>
            <button 
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              등록 신청
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="거래처명, 연락처, 주소 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* 거래처 목록 */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
          {filteredDealers.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                {dealers.length === 0 ? '등록된 거래처가 없습니다' : '검색 결과가 없습니다'}
              </h3>
              <p className="text-sm text-gray-400">
                {dealers.length === 0 ? '거래처를 추가해보세요.' : '다른 검색어로 시도해보세요.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDealers.map((dealer) => (
                <div 
                  key={dealer.id} 
                  className="bg-white px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openDetailModal(dealer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{dealer.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Phone className="w-3 h-3" />
                        <span>{dealer.contact}</span>
                      </div>
                      {dealer.address && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{dealer.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center ml-2">
                      <span className="text-[10px] text-gray-400">{dealer.createdAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 py-2">
          <div className="flex items-center justify-around">
            <Link href="/" className="flex-1 flex flex-col items-center py-2 text-gray-600">
              <HomeIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">홈</span>
            </Link>
            <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-gray-600">
              <Gavel className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">경매</span>
            </Link>
            <Link href="/market" className="flex-1 flex flex-col items-center py-2 text-gray-600">
              <BarChart3 className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">시세</span>
            </Link>
            <Link href="/trade" className="flex-1 flex flex-col items-center py-2 text-red-600">
              <FileText className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">거래</span>
            </Link>
            <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-gray-600">
              <User className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">내정보</span>
            </Link>
          </div>
        </div>

        {/* 추가 모달 */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowAddModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                  <h3 className="text-base font-bold">거래처 등록 신청</h3>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1 hide-scrollbar">
                  {/* 기본 정보 */}
                  <div className="text-xs font-bold text-gray-500 mb-1">기본 정보</div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">거래처명 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="거래처명 입력"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">연락처 *</label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                      placeholder="연락처 입력"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">주소</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="주소 입력"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">사업자번호 *</label>
                      <input
                        type="text"
                        value={formData.businessNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessNo: e.target.value }))}
                        placeholder="000-00-00000"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">대표자</label>
                      <input
                        type="text"
                        value={formData.representative}
                        onChange={(e) => setFormData(prev => ({ ...prev, representative: e.target.value }))}
                        placeholder="대표자명"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">업태</label>
                      <input
                        type="text"
                        value={formData.businessType}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                        placeholder="업태"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">종목</label>
                      <input
                        type="text"
                        value={formData.businessCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessCategory: e.target.value }))}
                        placeholder="종목"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                  </div>

                  {/* 담당자 정보 */}
                  <div className="text-xs font-bold text-gray-500 mt-4 mb-1">담당자 정보</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">담당자명</label>
                      <input
                        type="text"
                        value={formData.managerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                        placeholder="담당자명"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">담당자 연락처</label>
                      <input
                        type="text"
                        value={formData.managerContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, managerContact: e.target.value }))}
                        placeholder="010-0000-0000"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">담당자 이메일</label>
                    <input
                      type="email"
                      value={formData.managerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, managerEmail: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>

                  {/* 배송지 정보 */}
                  <div className="text-xs font-bold text-gray-500 mt-4 mb-1">배송지</div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">배송지 주소</label>
                    <input
                      type="text"
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                      placeholder="배송지 주소 (미입력 시 기본 주소 사용)"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                    />
                  </div>

                  {/* 첨부파일 */}
                  <div className="text-xs font-bold text-gray-500 mt-4 mb-1">첨부파일</div>
                  <div className="space-y-2">
                    {/* 사업자등록증 */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">사업자등록증</label>
                      <div className="relative">
                        {businessLicenseFile ? (
                          <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{businessLicenseFile.name}</div>
                                <div className="text-[10px] text-gray-400">{formatFileSize(businessLicenseFile.size)}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBusinessLicenseFile(null)}
                              className="p-1 hover:bg-gray-200 rounded ml-2"
                            >
                              <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">파일 선택</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, setBusinessLicenseFile)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    
                    {/* 신고필증 */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">신고필증</label>
                      <div className="relative">
                        {reportCertificateFile ? (
                          <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{reportCertificateFile.name}</div>
                                <div className="text-[10px] text-gray-400">{formatFileSize(reportCertificateFile.size)}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReportCertificateFile(null)}
                              className="p-1 hover:bg-gray-200 rounded ml-2"
                            >
                              <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">파일 선택</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, setReportCertificateFile)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400">* PDF, JPG, PNG 파일 첨부 가능</p>
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 mb-1">* 팩스로 보내셔도 됩니다.</p>
                      <p className="text-xs font-medium text-gray-700">FAX. 031-123-4567</p>
                    </div>
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={!formData.name || !formData.contact || !formData.businessNo}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                      formData.name && formData.contact && formData.businessNo
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    등록 신청하기
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-2">
                    등록 신청 후 관리자 승인을 거쳐 사용 가능합니다.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 등록 신청 완료 모달 */}
        <AnimatePresence>
          {showSuccessModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowSuccessModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-xl shadow-xl w-full max-w-xs overflow-hidden"
              >
                <div className="p-5 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">등록 신청 완료</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    거래처 등록 신청이 완료되었습니다.<br />
                    관리자 승인 후 사용 가능합니다.
                  </p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    확인
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 배송지 수정 모달 */}
        <AnimatePresence>
          {showDeliveryEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowDeliveryEditModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-base font-bold">배송지 수정</h3>
                  <button 
                    onClick={() => setShowDeliveryEditModal(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <label className="block text-xs text-gray-500 mb-1">배송지 주소</label>
                  <input
                    type="text"
                    value={editDeliveryAddress}
                    onChange={(e) => setEditDeliveryAddress(e.target.value)}
                    placeholder="배송지 주소 입력"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 bg-white mb-4"
                  />
                  <button
                    onClick={handleDeliveryEdit}
                    className="w-full py-3 rounded-lg font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 상세 정보 모달 */}
        <AnimatePresence>
          {showDetailModal && selectedDealer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowDetailModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden max-h-[80vh] flex flex-col"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                  <h3 className="text-base font-bold">{selectedDealer.name}</h3>
                  <button 
                    onClick={() => setShowDetailModal(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* 내용 */}
                <div className="p-4 overflow-y-auto flex-1 hide-scrollbar">
                  {/* 기본 정보 */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      사업자 정보
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">사업자번호</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.businessNo || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">대표자</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.representative || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">업태</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.businessType || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">종목</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.businessCategory || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 연락처 정보 */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      연락처
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">대표번호</span>
                        <a href={`tel:${selectedDealer.contact}`} className="text-gray-900 font-medium flex items-center gap-1">
                          {selectedDealer.contact}
                          <Phone className="w-3 h-3 text-gray-400" />
                        </a>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">주소</span>
                        <span className="text-gray-900 font-medium text-right max-w-[180px]">{selectedDealer.address || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 담당자 정보 */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <UserCircle className="w-3.5 h-3.5" />
                      담당자 정보
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">담당자명</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.managerName || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">연락처</span>
                        {selectedDealer.managerContact ? (
                          <a href={`tel:${selectedDealer.managerContact}`} className="text-gray-900 font-medium flex items-center gap-1">
                            {selectedDealer.managerContact}
                            <Phone className="w-3 h-3 text-gray-400" />
                          </a>
                        ) : (
                          <span className="text-gray-900 font-medium">-</span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">이메일</span>
                        <span className="text-gray-900 font-medium">{selectedDealer.managerEmail || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 배송지 정보 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />
                        배송지
                      </h4>
                      <button
                        onClick={openDeliveryEditModal}
                        className="text-[10px] text-red-600 font-medium hover:underline"
                      >
                        수정
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{selectedDealer.deliveryAddress || selectedDealer.address || '-'}</p>
                    </div>
                  </div>

                  {/* 첨부파일 */}
                  {(selectedDealer.businessLicense || selectedDealer.reportCertificate) && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" />
                        첨부파일
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        {selectedDealer.businessLicense && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileIcon className="w-4 h-4 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 font-medium truncate">{selectedDealer.businessLicense.name}</div>
                              <div className="text-[10px] text-gray-400">사업자등록증 · {formatFileSize(selectedDealer.businessLicense.size)}</div>
                            </div>
                          </div>
                        )}
                        {selectedDealer.reportCertificate && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileIcon className="w-4 h-4 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 font-medium truncate">{selectedDealer.reportCertificate.name}</div>
                              <div className="text-[10px] text-gray-400">신고필증 · {formatFileSize(selectedDealer.reportCertificate.size)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 등록일 */}
                  <div className="text-center text-xs text-gray-400">
                    등록일: {selectedDealer.createdAt}
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="p-4 border-t flex-shrink-0">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

