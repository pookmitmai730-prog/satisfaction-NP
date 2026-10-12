import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import pwaLogo from './assets/pwa.webp';

export default function StaffEvaluationApp() {
  const [step, setStep] = useState('login'); // 'login' | 'evaluating' | 'success' | 'admin-login' | 'admin-dashboard'
  const [activeAdminTab, setActiveAdminTab] = useState('reports'); // 'reports' | 'employees' | 'criteria'
  
  // พนักงาน & ล็อกอิน & ประเภทบริการ
  const [inputEmpId, setInputEmpId] = useState('');
  const [serviceType, setServiceType] = useState('counter'); // 'counter' (เคาน์เตอร์รับบริการ) | 'other' (อื่นๆ)
  const [currentStaff, setCurrentStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  
  // ผลประเมิน
  const [scores, setScores] = useState({});
  const [counterOverallScore, setCounterOverallScore] = useState(null); // คะแนนรวมสำหรับเคาน์เตอร์
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Admin States
  const [adminPin, setAdminPin] = useState('');
  const [evaluationsList, setEvaluationsList] = useState([]);
  const [openGraphId, setOpenGraphId] = useState(null);

  // Pagination State (แบ่งหน้าตารางครั้งละ 10 แถว)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Form States: เพิ่ม/แก้ไขพนักงาน
  const [editingEmpDocId, setEditingEmpDocId] = useState(null);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPosition, setNewEmpPosition] = useState('');
  const [newEmpPhoto, setNewEmpPhoto] = useState('');

  // Form States: เพิ่ม/แก้ไขหัวข้อการประเมิน
  const [editingCriteriaId, setEditingCriteriaId] = useState(null);
  const [newCriteriaTitle, setNewCriteriaTitle] = useState('');

  // Report Filter States
  const [reportPeriod, setReportPeriod] = useState('daily'); // 'daily' | 'monthly' | 'yearly' | 'all'
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all');

  // โหลดข้อมูลเบื้องต้น
  useEffect(() => {
    fetchStaffs();
    fetchCriteria();
  }, []);

  const fetchStaffs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "employees"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(list);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchCriteria = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "criteria"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCriteriaList(list);
    } catch (err) {
      console.error("Error fetching criteria:", err);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "evaluations"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEvaluationsList(list);
    } catch (err) {
      console.error("Error fetching evaluations:", err);
    }
  };

  const requestFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.log(err));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  // 1. เข้าสู่ระบบพนักงาน
  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const foundStaff = staffList.find(staff => 
      String(staff.employeeId).trim() === String(inputEmpId).trim()
    );
    
    if (foundStaff) {
      setCurrentStaff(foundStaff);
      setStep('evaluating');
      requestFullScreen();
    } else {
      setErrorMsg('ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
    }
  };

  // 2. ส่งผลการประเมิน
  const handleSubmitScore = async (e) => {
    e.preventDefault();

    if (serviceType === 'counter' && !counterOverallScore) {
      alert("กรุณาเลือกระดับความพึงพอใจก่อนยืนยันครับ");
      return;
    }

    try {
      await addDoc(collection(db, "evaluations"), {
        employeeId: currentStaff.employeeId,
        employeeName: currentStaff.name,
        serviceType: serviceType,
        scores: serviceType === 'counter' ? { overall: counterOverallScore } : scores,
        comment,
        createdAt: new Date().toISOString()
      });
      setStep('success');
      setTimeout(() => {
        setStep('evaluating');
        setScores({});
        setCounterOverallScore(null);
        setComment('');
      }, 2000);
    } catch (error) {
      console.error("Error submitting score: ", error);
    }
  };

  // 3. เข้าสู่ระบบ Admin
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '1234') {
      setStep('admin-dashboard');
      fetchEvaluations();
      setAdminPin('');
      setErrorMsg('');
    } else {
      setErrorMsg('รหัส PIN Admin ไม่ถูกต้อง (รหัสเริ่มต้น: 1234)');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmpPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpId || !newEmpName) return;

    const empData = {
      employeeId: isNaN(Number(newEmpId)) ? newEmpId : Number(newEmpId),
      name: newEmpName,
      position: newEmpPosition || "เจ้าหน้าที่บริการ",
      photoUrl: newEmpPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop&crop=faces"
    };

    try {
      if (editingEmpDocId) {
        await updateDoc(doc(db, "employees", editingEmpDocId), empData);
      } else {
        await addDoc(collection(db, "employees"), empData);
      }
      resetEmpForm();
      fetchStaffs();
    } catch (err) {
      console.error("Error saving employee:", err);
    }
  };

  const handleStartEditEmployee = (emp) => {
    setEditingEmpDocId(emp.id);
    setNewEmpId(emp.employeeId);
    setNewEmpName(emp.name);
    setNewEmpPosition(emp.position || '');
    setNewEmpPhoto(emp.photoUrl || '');
  };

  const resetEmpForm = () => {
    setEditingEmpDocId(null);
    setNewEmpId('');
    setNewEmpName('');
    setNewEmpPosition('');
    setNewEmpPhoto('');
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("คุณต้องการลบข้อมูลพนักงานคนนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "employees", id));
        if (editingEmpDocId === id) resetEmpForm();
        fetchStaffs();
      } catch (err) {
        console.error("Error deleting employee:", err);
      }
    }
  };

  const handleSaveCriteria = async (e) => {
    e.preventDefault();
    if (!newCriteriaTitle.trim()) return;

    try {
      if (editingCriteriaId) {
        await updateDoc(doc(db, "criteria", editingCriteriaId), {
          title: newCriteriaTitle
        });
      } else {
        await addDoc(collection(db, "criteria"), {
          title: newCriteriaTitle,
          active: true,
          order: criteriaList.length + 1
        });
      }
      resetCriteriaForm();
      fetchCriteria();
    } catch (err) {
      console.error("Error saving criteria:", err);
    }
  };

  const handleToggleCriteriaActive = async (crit) => {
    const currentActiveState = crit.active !== false;
    try {
      await updateDoc(doc(db, "criteria", crit.id), {
        active: !currentActiveState
      });
      fetchCriteria();
    } catch (err) {
      console.error("Error toggling criteria active state:", err);
    }
  };

  const handleStartEditCriteria = (crit) => {
    setEditingCriteriaId(crit.id);
    setNewCriteriaTitle(crit.title);
  };

  const resetCriteriaForm = () => {
    setEditingCriteriaId(null);
    setNewCriteriaTitle('');
  };

  const handleDeleteCriteria = async (id) => {
    if (window.confirm("คุณต้องการลบหัวข้อการประเมินนี้ใช่หรือไม่?")) {
      try {
        await deleteDoc(doc(db, "criteria", id));
        if (editingCriteriaId === id) resetCriteriaForm();
        fetchCriteria();
      } catch (err) {
        console.error("Error deleting criteria:", err);
      }
    }
  };

  const getFilteredEvaluations = () => {
    const now = new Date();
    return evaluationsList.filter(item => {
      if (selectedStaffFilter !== 'all' && String(item.employeeId) !== String(selectedStaffFilter)) {
        return false;
      }
      if (!item.createdAt) return true;
      const itemDate = new Date(item.createdAt);
      if (reportPeriod === 'daily') {
        return itemDate.toDateString() === now.toDateString();
      } else if (reportPeriod === 'monthly') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      } else if (reportPeriod === 'yearly') {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredData = getFilteredEvaluations();

  // คำนวณสถิติรายงานทั้งหมด (รวมทั้งรายงานเคาน์เตอร์แยกต่างหาก)
  const calculateReportStats = () => {
    const totalEvals = filteredData.length;
    
    // สถิติเฉพาะเคาน์เตอร์รับบริการ
    const counterReport = {
      title: 'ความพึงพอใจในการรับบริการครั้งนี้',
      scoresCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalScoreSum: 0,
      ratedCount: 0
    };

    const criteriaStats = {};
    criteriaList.forEach(crit => {
      criteriaStats[crit.id] = {
        id: crit.id,
        title: crit.title,
        scoresCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalScoreSum: 0,
        ratedCount: 0
      };
    });

    const staffScoreMap = {};

    filteredData.forEach(item => {
      const empId = item.employeeId;
      if (!staffScoreMap[empId]) {
        staffScoreMap[empId] = { name: item.employeeName, totalScore: 0, count: 0 };
      }

      if (item.scores) {
        if (item.serviceType === 'counter' || item.scores.overall) {
          const score = item.scores.overall;
          if (score >= 1 && score <= 5) {
            counterReport.scoresCount[score] += 1;
            counterReport.totalScoreSum += score;
            counterReport.ratedCount += 1;

            staffScoreMap[empId].totalScore += score;
            staffScoreMap[empId].count += 1;
          }
        } else {
          Object.entries(item.scores).forEach(([critId, score]) => {
            if (criteriaStats[critId]) {
              if (score >= 1 && score <= 5) {
                criteriaStats[critId].scoresCount[score] += 1;
                criteriaStats[critId].totalScoreSum += score;
                criteriaStats[critId].ratedCount += 1;
              }
            }
            staffScoreMap[empId].totalScore += score;
            staffScoreMap[empId].count += 1;
          });
        }
      }
    });

    const staffRanking = Object.entries(staffScoreMap).map(([empId, data]) => {
      const avg = data.count > 0 ? data.totalScore / data.count : 0;
      return { ...data, empId, avg };
    }).sort((a, b) => b.avg - a.avg);

    let topCriteria = null;
    let lowestCriteria = null;
    let maxCritAvg = -1;
    let minCritAvg = 999;

    Object.values(criteriaStats).forEach(crit => {
      if (crit.ratedCount > 0) {
        const avg = crit.totalScoreSum / crit.ratedCount;
        if (avg > maxCritAvg) {
          maxCritAvg = avg;
          topCriteria = { ...crit, avg };
        }
        if (avg < minCritAvg) {
          minCritAvg = avg;
          lowestCriteria = { ...crit, avg };
        }
      }
    });

    const topStaff = staffRanking.length > 0 ? staffRanking[0] : null;

    return { totalEvals, counterReport, criteriaStats, topStaff, staffRanking, topCriteria, lowestCriteria };
  };

  const reportStats = calculateReportStats();

  // คำนวณข้อมูลสำหรับ Pagination ของตารางประวัติ
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableData = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const handlePeriodChange = (e) => {
    setReportPeriod(e.target.value);
    setCurrentPage(1);
  };

  const handleStaffFilterChange = (e) => {
    setSelectedStaffFilter(e.target.value);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "=== ประวัติการประเมินย้อนหลัง ===\n";
    csvContent += "วันที่-เวลา,ประเภทบริการ,รหัสพนักงาน,ชื่อพนักงาน,ข้อเสนอแนะ,คะแนนรวม\n";

    filteredData.forEach(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-';
      const serviceTypeName = item.serviceType === 'other' ? 'อื่นๆ' : 'เคาน์เตอร์รับบริการ';
      const totalScore = item.scores ? Object.values(item.scores).reduce((a, b) => a + b, 0) : 0;
      const cleanComment = (item.comment || '').replace(/"/g, '""');
      csvContent += `"${dateStr}","${serviceTypeName}","${item.employeeId}","${item.employeeName}","${cleanComment}",${totalScore}\n`;
    });

    csvContent += "\n=== สรุปอันดับคะแนนพนักงาน (เรียงจากมากไปน้อย) ===\n";
    csvContent += "อันดับ,รหัสพนักงาน,ชื่อพนักงาน,จำนวนครั้งที่รับประเมิน,คะแนนเฉลี่ย (เต็ม 5.00)\n";
    
    reportStats.staffRanking.forEach((staff, idx) => {
      csvContent += `${idx + 1},"${staff.empId}","${staff.name}",${staff.count},${staff.avg.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานการประเมิน_${reportPeriod}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const staffName = selectedStaffFilter === 'all' 
      ? 'ภาพรวมพนักงานทุกคนรวมกัน' 
      : staffList.find(s => String(s.employeeId) === String(selectedStaffFilter))?.name || selectedStaffFilter;

    const printWindow = window.open('', '_blank', 'width=950,height=800');
    
    let criteriaSummaryHTML = '';

    if (reportStats.counterReport.ratedCount > 0) {
      const ratedC = reportStats.counterReport.ratedCount;
      const cAvg = (reportStats.counterReport.totalScoreSum / ratedC).toFixed(2);
      criteriaSummaryHTML += `
        <div style="margin-bottom: 16px; background: #e0f2fe; border: 1px solid #7dd3fc; padding: 12px; border-radius: 10px;">
          <b style="font-size: 14px; color: #0369a1;">🏢 เคาน์เตอร์รับบริการ: ${reportStats.counterReport.title}</b>
          <span style="float: right; background: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">คะแนนเฉลี่ย: ${cAvg} / 5.00</span>
          <div style="margin-top: 8px; font-size: 11px;">
            ประเมินทั้งหมด: ${ratedC} ครั้ง
          </div>
        </div>
      `;
    }

    Object.values(reportStats.criteriaStats).forEach((stat, idx) => {
      const rated = stat.ratedCount || 1;
      const avg = (stat.totalScoreSum / rated).toFixed(2);

      criteriaSummaryHTML += `
        <div style="margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <b style="font-size: 13px; color: #0f172a;">${idx + 1}. ${stat.title}</b>
            <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">คะแนนเฉลี่ย: ${avg} / 5.00</span>
          </div>
        </div>
      `;
    });

    let staffRankingHTML = '';
    reportStats.staffRanking.forEach((staff, idx) => {
      staffRankingHTML += `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;"><b>อันดับ ${idx + 1}</b></td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${staff.name} (${staff.empId})</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${staff.count} ครั้ง</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7;">${staff.avg.toFixed(2)} / 5.00</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานสรุปผลการประเมิน - การประปาส่วนภูมิภาคสาขานครพนม</title>
          <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #0f172a; line-height: 1.4; }
            h1 { font-size: 18px; margin-bottom: 5px; color: #0369a1; }
            h2 { font-size: 14px; margin-top: 15px; color: #0284c7; border-bottom: 2px solid #bae6fd; padding-bottom: 4px; }
            p { font-size: 12px; color: #64748b; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th { background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          </style>
        </head>
        <body>
          <h1>💧 รายงานสรุปผลการประเมินความพึงพอใจ (การประปาส่วนภูมิภาคสาขานครพนม)</h1>
          <p>ช่วงเวลา: <b>${reportPeriod.toUpperCase()}</b> | พนักงาน: <b>${staffName}</b> | จำนวนผู้ประเมินรวม: <b>${reportStats.totalEvals} ราย</b></p>
          
          <h2>🏆 สรุปจัดอันดับพนักงานเรียงตามคะแนนความพึงพอใจ</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">อันดับ</th>
                <th>ชื่อ-นามสกุล (รหัส)</th>
                <th style="text-align: center;">จำนวนประเมิน</th>
                <th style="text-align: center;">คะแนนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              ${staffRankingHTML || '<tr><td colspan="4" style="text-align:center;">ไม่มีข้อมูลพนักงาน</td></tr>'}
            </tbody>
          </table>

          <h2>📊 สรุปผลคะแนนประเมินแยกตามประเภท/หัวข้อ</h2>
          ${criteriaSummaryHTML || '<p>ยังไม่มีข้อมูลหัวข้อประเมิน</p>'}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 🌟 ไอคอนประเมิน 5 ระดับ (เรียงลำดับขนาดจากเล็กไปใหญ่)
  const emotionLevels5 = [
    { score: 1, emoji: '😡', label: 'พอใจน้อยมาก', sizeClass: 'text-xl sm:text-2xl md:text-3xl' },
    { score: 2, emoji: '🙁', label: 'พอใจน้อย', sizeClass: 'text-2xl sm:text-3xl md:text-4xl' },
    { score: 3, emoji: '😐', label: 'พอใจปานกลาง', sizeClass: 'text-3xl sm:text-4xl md:text-5xl' },
    { score: 4, emoji: '😊', label: 'พอใจมาก', sizeClass: 'text-4xl sm:text-5xl md:text-6xl' },
    { score: 5, emoji: '😍', label: 'พอใจมากที่สุด', sizeClass: 'text-5xl sm:text-6xl md:text-7xl' }
  ];

  const visibleCriteriaList = criteriaList.filter(crit => crit.active !== false);

  return (
    <div className="h-screen w-screen bg-sky-50 flex items-center justify-center p-0 m-0 overflow-hidden font-sans">
      
      {/* 🔐 1. หน้าจอ Login พนักงาน */}
      {step === 'login' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center relative">
          
          <div className="mb-4">
            <img 
              src={pwaLogo} 
              alt="โลโก้ กปภ." 
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain drop-shadow-md"
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-sky-900 mb-2">ระบบประเมินความพึงพอใจการให้บริการ กปภ.สาขานครพนม</h2>
          <p className="text-sm sm:text-base text-sky-600/70 mb-4">เลือกประเภทบริการและกรอกรหัสพนักงาน</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 🔘 เลือกประเภทจุดบริการ */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-sky-900">เลือกประเภทจุดบริการ:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType('counter')}
                  className={`p-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1 ${
                    serviceType === 'counter' 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300' 
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <span>🏢</span>
                  <span>1. เคาน์เตอร์รับบริการ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType('other')}
                  className={`p-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1 ${
                    serviceType === 'other' 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300' 
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <span>📌</span>
                  <span>2. อื่นๆ</span>
                </button>
              </div>
            </div>

            <div>
              <input 
                type="text" 
                placeholder="กรอกรหัสพนักงาน (เช่น 1234)" 
                value={inputEmpId}
                onChange={(e) => setInputEmpId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-sky-200 bg-sky-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-lg sm:text-xl font-semibold tracking-wider text-sky-900 placeholder-sky-300"
                required
              />
            </div>

            {errorMsg && <p className="text-red-500 text-xs sm:text-sm font-medium">{errorMsg}</p>}
            
            <button 
              type="submit"
              className="w-full bg-sky-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-sky-700 transition shadow-lg shadow-sky-200 text-base sm:text-lg"
            >
              เข้าสู่หน้าประเมิน
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-sky-100">
            <button
              onClick={() => { setStep('admin-login'); setErrorMsg(''); }}
              className="text-xs sm:text-sm text-sky-600 hover:text-sky-800 font-medium transition"
            >
              ⚙️ เข้าสู่ระบบผู้ดูแลระบบ (Admin)
            </button>
          </div>
        </div>
      )}

      {/* 🔒 2. หน้าจอ Login Admin */}
      {step === 'admin-login' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-sky-800 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl sm:text-3xl mb-4 shadow-md">
            🔒
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-900 mb-2">ผู้ดูแลระบบ (Admin)</h2>
          <p className="text-sm sm:text-base text-sky-600/70 mb-6">กรุณากรอกรหัส PIN (ค่าเริ่มต้น: 1234)</p>
          
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="PIN Admin" 
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-sky-200 bg-sky-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-lg sm:text-xl font-semibold tracking-widest text-sky-900"
              required
            />
            {errorMsg && <p className="text-red-500 text-xs sm:text-sm font-medium">{errorMsg}</p>}
            <button 
              type="submit"
              className="w-full bg-sky-800 text-white py-3.5 rounded-2xl font-semibold hover:bg-sky-900 transition shadow-lg text-base sm:text-lg"
            >
              เข้าสู่ระบบ Admin
            </button>
            <button 
              type="button"
              onClick={() => { setStep('login'); setErrorMsg(''); }}
              className="w-full text-sky-600 py-2 text-sm sm:text-base hover:underline"
            >
              กลับหน้าหลัก
            </button>
          </form>
        </div>
      )}

      {/* 📊 3. หน้าจอ Admin Dashboard หลัก */}
      {step === 'admin-dashboard' && (
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-sky-100 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-sky-100 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-sky-900">สำหรับผู้ดูแลระบบ</h2>
              <p className="text-xs sm:text-sm text-sky-600">จัดการข้อมูลพนักงาน หัวข้อการประเมิน และรายงานสรุป</p>
            </div>
            
            <div className="flex bg-sky-50 p-1.5 rounded-2xl border border-sky-100 space-x-1">
              <button 
                onClick={() => setActiveAdminTab('reports')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${activeAdminTab === 'reports' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-700 hover:bg-sky-100'}`}
              >
                📊 รายงานผล
              </button>
              <button 
                onClick={() => setActiveAdminTab('employees')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${activeAdminTab === 'employees' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-700 hover:bg-sky-100'}`}
              >
                👥 พนักงาน
              </button>
              <button 
                onClick={() => setActiveAdminTab('criteria')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${activeAdminTab === 'criteria' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-700 hover:bg-sky-100'}`}
              >
                📝 หัวข้อประเมิน
              </button>
              <button 
                onClick={() => setStep('login')}
                className="px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-500 hover:bg-red-50 transition"
              >
                ออก
              </button>
            </div>
          </div>

          {/* TAB 1: รายงานการประเมิน */}
          {activeAdminTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-sky-900 mb-1">ช่วงเวลาสั่งสรุปรายงาน</label>
                  <select 
                    value={reportPeriod} 
                    onChange={handlePeriodChange}
                    className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm bg-white text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="daily">📅 ประจำวัน (วันนี้)</option>
                    <option value="monthly">📆 ประจำเดือน (เดือนนี้)</option>
                    <option value="yearly">🗓️ ประจำปี (ปีนี้)</option>
                    <option value="all">♾️ ทั้งหมด</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sky-900 mb-1">เลือกพนักงาน</label>
                  <select 
                    value={selectedStaffFilter} 
                    onChange={handleStaffFilterChange}
                    className="w-full p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm bg-white text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">👥 ภาพรวมพนักงานทุกคนรวมกัน</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.employeeId}>👤 {s.name} ({s.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2.5 px-3 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-1"
                  >
                    📥 Export Excel
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex-1 bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm py-2.5 px-3 rounded-xl font-semibold transition shadow-md flex items-center justify-center gap-1"
                  >
                    🖨️ เปิดรายงาน PDF
                  </button>
                </div>
              </div>

              {/* 📌 สรุปจำนวนผู้ประเมินตามช่วงเวลา */}
              <div className="bg-sky-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs text-sky-100 font-medium">สถิติจำนวนผู้ทำรายการประเมิน ({reportPeriod === 'daily' ? 'ประจำวัน' : reportPeriod === 'monthly' ? 'ประจำเดือน' : reportPeriod === 'yearly' ? 'ประจำปี' : 'ทั้งหมด'})</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-0.5">{reportStats.totalEvals} <span className="text-sm font-normal">ราย</span></h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900 mb-1">💚 หัวข้อที่ลูกค้าพึงพอใจมากที่สุด</h4>
                  {reportStats.topCriteria ? (
                    <div className="text-xs sm:text-sm text-emerald-800 space-y-1">
                      <p><b>หัวข้อ:</b> {reportStats.topCriteria.title}</p>
                      <p><b>คะแนนเฉลี่ย:</b> {reportStats.topCriteria.avg.toFixed(2)} / 5.00 คะแนน</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการประเมิน</p>
                  )}
                </div>

                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                  <h4 className="text-xs sm:text-sm font-bold text-rose-900 mb-1">💔 หัวข้อที่ลูกค้าพึงพอใจน้อยที่สุด</h4>
                  {reportStats.lowestCriteria ? (
                    <div className="text-xs sm:text-sm text-rose-800 space-y-1">
                      <p><b>หัวข้อ:</b> {reportStats.lowestCriteria.title}</p>
                      <p><b>คะแนนเฉลี่ย:</b> {reportStats.lowestCriteria.avg.toFixed(2)} / 5.00 คะแนน</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการประเมิน</p>
                  )}
                </div>
              </div>

              {/* 🏢 สรุปรายงานเฉพาะ "เคาน์เตอร์รับบริการ" (เพิ่มขึ้นมาต่างหาก) */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-300 shadow-sm space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2 flex items-center justify-between">
                  <span>🏢 รายงานผลการประเมิน: เคาน์เตอร์รับบริการ</span>
                  <span className="text-xs font-normal text-sky-600">หัวข้อประเมินหลัก</span>
                </h3>

                {reportStats.counterReport.ratedCount === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีข้อมูลการประเมินจากเคาน์เตอร์รับบริการ</p>
                ) : (() => {
                  const cReport = reportStats.counterReport;
                  const rated = cReport.ratedCount || 1;
                  const p1 = Number(((cReport.scoresCount[1] / rated) * 100).toFixed(1));
                  const p2 = Number(((cReport.scoresCount[2] / rated) * 100).toFixed(1));
                  const p3 = Number(((cReport.scoresCount[3] / rated) * 100).toFixed(1));
                  const p4 = Number(((cReport.scoresCount[4] / rated) * 100).toFixed(1));
                  const p5 = Number(((cReport.scoresCount[5] / rated) * 100).toFixed(1));
                  const avg = (cReport.totalScoreSum / rated).toFixed(2);
                  const isGraphOpen = openGraphId === 'counter_report_graph';

                  return (
                    <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-3">
                      <div className="flex justify-between items-center text-xs sm:text-sm flex-wrap gap-2">
                        <span className="font-bold text-sky-950">📌 {cReport.title}</span>
                        
                        <div className="flex items-center space-x-2">
                          <span className="bg-sky-600 text-white px-3 py-1 rounded-lg font-extrabold text-xs">
                            คะแนนเฉลี่ย: {avg} / 5.00
                          </span>
                          
                          <button 
                            onClick={() => setOpenGraphId(isGraphOpen ? null : 'counter_report_graph')}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                              isGraphOpen ? 'bg-sky-800 text-white' : 'bg-white text-sky-700 border border-sky-300 hover:bg-sky-100'
                            }`}
                          >
                            <span>📊</span>
                            <span>{isGraphOpen ? 'ซ่อนกราฟ' : 'ดูแสดงกราฟ'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] sm:text-xs">
                        <div className="bg-white p-2 rounded-lg border border-red-100 text-red-700">
                          😡 น้อยมาก: <b>{cReport.scoresCount[1]} คน</b> ({p1}%)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-orange-100 text-orange-700">
                          🙁 น้อย: <b>{cReport.scoresCount[2]} คน</b> ({p2}%)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-amber-100 text-amber-700">
                          😐 ปานกลาง: <b>{cReport.scoresCount[3]} คน</b> ({p3}%)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-sky-100 text-sky-700">
                          😊 มาก: <b>{cReport.scoresCount[4]} คน</b> ({p4}%)
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-emerald-100 text-emerald-700">
                          😍 มากที่สุด: <b>{cReport.scoresCount[5]} คน</b> ({p5}%)
                        </div>
                      </div>

                      {isGraphOpen && (
                        <div className="bg-white p-4 rounded-xl border border-sky-200 mt-2 space-y-2.5">
                          <p className="text-xs font-bold text-sky-900 border-b border-sky-100 pb-1">📈 กราฟแท่งแสดงระดับความพึงพอใจเคาน์เตอร์รับบริการ</p>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between mb-0.5 text-red-700 font-semibold">
                                <span>😡 พอใจน้อยมาก</span>
                                <span>{p1}% ({cReport.scoresCount[1]} คน)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p1}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-0.5 text-orange-700 font-semibold">
                                <span>🙁 พอใจน้อย</span>
                                <span>{p2}% ({cReport.scoresCount[2]} คน)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p2}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-0.5 text-amber-700 font-semibold">
                                <span>😐 พอใจปานกลาง</span>
                                <span>{p3}% ({cReport.scoresCount[3]} คน)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p3}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-0.5 text-sky-700 font-semibold">
                                <span>😊 พอใจมาก</span>
                                <span>{p4}% ({cReport.scoresCount[4]} คน)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p4}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-0.5 text-emerald-700 font-semibold">
                                <span>😍 พอใจมากที่สุด</span>
                                <span>{p5}% ({cReport.scoresCount[5]} คน)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p5}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2">🏆 สรุปอันดับพนักงานเรียงตามคะแนนความพึงพอใจ (จากมากไปน้อย)</h3>
                
                {reportStats.staffRanking.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลการประเมินพนักงาน</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportStats.staffRanking.map((staff, idx) => (
                      <div key={staff.empId} className="flex items-center justify-between p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-sky-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-sky-900">{staff.name}</p>
                            <p className="text-[10px] text-sky-600">รหัส: {staff.empId} | ประเมิน {staff.count} ครั้ง</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-sky-800 bg-white px-2 py-1 rounded-lg border border-sky-200 shadow-2xs">
                          {staff.avg.toFixed(2)} / 5.0
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* สรุปกราฟสถิติหัวข้ออื่นๆ */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2">📊 สรุปผลการประเมินแยกตามหัวข้ออื่นๆ (คะแนนและเปอร์เซ็นต์)</h3>
                
                {Object.keys(reportStats.criteriaStats).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลหัวข้อการประเมิน</p>
                ) : (
                  <div className="space-y-4">
                    {Object.values(reportStats.criteriaStats).map((stat, idx) => {
                      const rated = stat.ratedCount || 1;
                      const p1 = Number(((stat.scoresCount[1] / rated) * 100).toFixed(1));
                      const p2 = Number(((stat.scoresCount[2] / rated) * 100).toFixed(1));
                      const p3 = Number(((stat.scoresCount[3] / rated) * 100).toFixed(1));
                      const p4 = Number(((stat.scoresCount[4] / rated) * 100).toFixed(1));
                      const p5 = Number(((stat.scoresCount[5] / rated) * 100).toFixed(1));
                      const avg = (stat.totalScoreSum / rated).toFixed(2);
                      const isGraphOpen = openGraphId === stat.id;

                      return (
                        <div key={idx} className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-100 space-y-3">
                          <div className="flex justify-between items-center text-xs sm:text-sm flex-wrap gap-2">
                            <span className="font-bold text-sky-900">{idx + 1}. {stat.title}</span>
                            
                            <div className="flex items-center space-x-2">
                              <span className="bg-sky-200 text-sky-800 px-2.5 py-1 rounded-md font-bold">
                                คะแนนเฉลี่ย: {avg} / 5.00
                              </span>
                              
                              <button 
                                onClick={() => setOpenGraphId(isGraphOpen ? null : stat.id)}
                                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs ${
                                  isGraphOpen ? 'bg-sky-700 text-white' : 'bg-white text-sky-700 border border-sky-300 hover:bg-sky-100'
                                }`}
                              >
                                <span>📊</span>
                                <span>{isGraphOpen ? 'ซ่อนกราฟ' : 'ดูแสดงกราฟ'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] sm:text-xs">
                            <div className="bg-white p-2 rounded-lg border border-red-100 text-red-700">
                              😡 น้อยมาก: <b>{stat.scoresCount[1]} คน</b> ({p1}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-orange-100 text-orange-700">
                              🙁 น้อย: <b>{stat.scoresCount[2]} คน</b> ({p2}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-100 text-amber-700">
                              😐 ปานกลาง: <b>{stat.scoresCount[3]} คน</b> ({p3}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-sky-100 text-sky-700">
                              😊 มาก: <b>{stat.scoresCount[4]} คน</b> ({p4}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-emerald-100 text-emerald-700">
                              😍 มากที่สุด: <b>{stat.scoresCount[5]} คน</b> ({p5}%)
                            </div>
                          </div>

                          {isGraphOpen && (
                            <div className="bg-white p-4 rounded-xl border border-sky-200 mt-2 space-y-3">
                              <p className="text-xs font-bold text-sky-900 border-b border-sky-100 pb-1">📈 กราฟแท่งเปรียบเทียบสัดส่วนเปอร์เซ็นต์การประเมิน</p>
                              
                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="flex justify-between mb-1 text-red-700 font-semibold">
                                    <span>😡 พอใจน้อยมาก</span>
                                    <span>{p1}% ({stat.scoresCount[1]} คน)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p1}%` }}></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-orange-700 font-semibold">
                                    <span>🙁 พอใจน้อย</span>
                                    <span>{p2}% ({stat.scoresCount[2]} คน)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p2}%` }}></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-amber-700 font-semibold">
                                    <span>😐 พอใจปานกลาง</span>
                                    <span>{p3}% ({stat.scoresCount[3]} คน)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p3}%` }}></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-sky-700 font-semibold">
                                    <span>😊 พอใจมาก</span>
                                    <span>{p4}% ({stat.scoresCount[4]} คน)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p4}%` }}></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1 text-emerald-700 font-semibold">
                                    <span>😍 พอใจมากที่สุด</span>
                                    <span>{p5}% ({stat.scoresCount[5]} คน)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${p5}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ประวัติการประเมินย้อนหลัง (10 แถว + Pagination) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs sm:text-sm font-bold text-sky-900">📋 ประวัติการประเมินย้อนหลัง (แสดงหน้าละ 10 รายการ)</h3>
                  <span className="text-xs text-sky-600">รวมทั้งหมด {filteredData.length} รายการ</span>
                </div>

                <div className="overflow-x-auto border border-sky-200 rounded-2xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-sky-100/70 text-sky-900 border-b border-sky-200">
                        <th className="p-3">วันที่-เวลา</th>
                        <th className="p-3">ประเภทบริการ</th>
                        <th className="p-3">รหัสพนักงาน</th>
                        <th className="p-3">ชื่อพนักงาน</th>
                        <th className="p-3">ข้อเสนอแนะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {currentTableData.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center p-8 text-sky-400">ไม่พบข้อมูลการประเมินตามเงื่อนไขที่เลือก</td>
                        </tr>
                      ) : (
                        currentTableData.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-sky-50/50">
                            <td className="p-3 text-sky-900">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}
                            </td>
                            <td className="p-3 font-semibold">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                                item.serviceType === 'other' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-800'
                              }`}>
                                {item.serviceType === 'other' ? '📌 อื่นๆ' : '🏢 เคาน์เตอร์'}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-sky-800">{item.employeeId}</td>
                            <td className="p-3 font-medium text-sky-900">{item.employeeName}</td>
                            <td className="p-3 text-slate-600 italic">{item.comment || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > 0 && (
                  <div className="flex items-center justify-between pt-2 px-1">
                    <span className="text-xs text-sky-700 font-medium">
                      หน้าที่ {currentPage} จาก {totalPages} (แสดง {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, filteredData.length)} จาก {filteredData.length} รายการ)
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          currentPage === 1 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                        }`}
                      >
                        ◀️ ก่อนหน้า
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          currentPage === totalPages 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                        }`}
                      >
                        ถัดไป ▶️
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: จัดการพนักงาน */}
          {activeAdminTab === 'employees' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveEmployee} className={`p-4 rounded-2xl border transition ${editingEmpDocId ? 'bg-amber-50/70 border-amber-200' : 'bg-sky-50/60 border-sky-100'} space-y-3`}>
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`text-xs sm:text-sm font-bold ${editingEmpDocId ? 'text-amber-900' : 'text-sky-900'}`}>
                    {editingEmpDocId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มข้อมูลพนักงานใหม่'}
                  </h3>
                  {editingEmpDocId && (
                    <button 
                      type="button" 
                      onClick={resetEmpForm}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="รหัสพนักงาน (เช่น 12349)"
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    className="p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="ชื่อ-นามสกุล"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="ตำแหน่ง (เช่น เจ้าหน้าที่บริการ)"
                    value={newEmpPosition}
                    onChange={(e) => setNewEmpPosition(e.target.value)}
                    className="p-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] text-sky-800 font-semibold">เลือกรูปภาพพนักงานจากเครื่อง:</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="p-1.5 rounded-xl border border-sky-200 text-xs bg-white text-sky-900 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200"
                    />
                  </div>
                </div>

                {newEmpPhoto && (
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-xs text-sky-800">รูปตัวอย่าง:</span>
                    <img src={newEmpPhoto} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-sky-300 shadow-sm" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className={`flex-1 text-white py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm shadow-md ${editingEmpDocId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'}`}
                  >
                    {editingEmpDocId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลพนักงาน'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900">รายชื่อพนักงานทั้งหมด ({staffList.length} คน)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staffList.map(emp => (
                    <div key={emp.id} className={`flex items-center justify-between p-3 bg-white border rounded-2xl shadow-2xs transition ${editingEmpDocId === emp.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-sky-100'}`}>
                      <div className="flex items-center space-x-3">
                        <img src={emp.photoUrl} alt={emp.name} className="w-14 h-14 rounded-full object-cover border-2 border-sky-100 shadow-xs" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-sky-900">{emp.name}</p>
                          <p className="text-[10px] sm:text-xs text-sky-600">รหัส: {emp.employeeId} | {emp.position}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleStartEditEmployee(emp)}
                          className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-amber-50 transition"
                        >
                          แก้ไข
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: จัดการหัวข้อประเมิน */}
          {activeAdminTab === 'criteria' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveCriteria} className="space-y-2">
                {editingCriteriaId && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-semibold text-amber-800">✏️ กำลังแก้ไขหัวข้อการประเมิน</span>
                    <button 
                      type="button" 
                      onClick={resetCriteriaForm}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="ชื่อหัวข้อการประเมินใหม่..."
                    value={newCriteriaTitle}
                    onChange={(e) => setNewCriteriaTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <button 
                    type="submit"
                    className={`text-white px-5 py-2.5 rounded-xl font-semibold transition text-xs sm:text-sm shadow-md ${editingCriteriaId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'}`}
                  >
                    {editingCriteriaId ? 'บันทึก' : 'เพิ่มหัวข้อ'}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {criteriaList.map((crit, index) => {
                  const isVisible = crit.active !== false;
                  return (
                    <div key={crit.id} className={`flex justify-between items-center border p-3.5 rounded-2xl transition ${editingCriteriaId === crit.id ? 'bg-amber-50/80 border-amber-300' : isVisible ? 'bg-sky-50/60 border-sky-100' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-semibold text-sky-900">{index + 1}. {crit.title}</span>
                        {!isVisible && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">(ซ่อนอยู่)</span>}
                      </div>
                      
                      <div className="flex space-x-1">
                        <button 
                          type="button"
                          onClick={() => handleToggleCriteriaActive(crit)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${isVisible ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                          {isVisible ? '👁️ แสดง' : '🙈 ซ่อน'}
                        </button>
                        <button 
                          onClick={() => handleStartEditCriteria(crit)}
                          className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-50 transition"
                        >
                          แก้ไข
                        </button>
                        <button 
                          onClick={() => handleDeleteCriteria(crit.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ⭐ 4. หน้าจอประเมินความพึงพอใจสำหรับลูกค้า */}
      {step === 'evaluating' && currentStaff && (
        <div className="bg-white w-screen h-screen flex flex-col justify-between p-3 sm:p-5 md:p-6 overflow-hidden relative">
          
          <button
            type="button"
            onClick={() => {
              if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              setStep('login');
              setInputEmpId('');
              setCurrentStaff(null);
              setScores({});
              setCounterOverallScore(null);
              setComment('');
            }}
            className="absolute top-3 right-3 text-xs text-sky-600 hover:text-red-500 border border-sky-200 bg-sky-50 px-3 py-1.5 rounded-xl transition font-semibold z-20"
          >
            ออกจากระบบ
          </button>

          <div className="flex flex-col items-center justify-center border-b border-sky-100 pb-2 mb-2 flex-shrink-0 text-center">
            <div className="mb-2">
              <img 
                src={currentStaff.photoUrl} 
                alt={currentStaff.name} 
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover shadow-xl border-4 border-sky-300 p-1 bg-white mx-auto"
              />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-900 leading-tight">{currentStaff.name}</h2>
            <p className="text-xs sm:text-sm md:text-base text-sky-600 font-semibold">{currentStaff.position}</p>
            <span className="mt-1 text-[11px] sm:text-xs bg-sky-100 text-sky-800 font-semibold px-3 py-0.5 rounded-full">
              จุดบริการ: {serviceType === 'counter' ? '🏢 เคาน์เตอร์รับบริการ' : '📌 อื่นๆ'}
            </span>
          </div>

          <form onSubmit={handleSubmitScore} className="flex flex-col justify-between flex-1 space-y-2 overflow-hidden">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 flex flex-col justify-around">
              
              <div className="text-center py-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-sky-800 bg-sky-100/70 py-2 px-4 rounded-2xl shadow-2xs inline-block">
                  💧 โปรดประเมินความพึงพอใจในการรับบริการครั้งนี้ 💧
                </h3>
              </div>

              {/* 🏢 กรณีเลือก "เคาน์เตอร์รับบริการ": ซ่อนหัวข้อประเมิน ให้กดเลือก 5 ระดับภาพรวม */}
              {serviceType === 'counter' ? (
                <div className="bg-sky-50/80 border border-sky-200 p-4 sm:p-6 rounded-3xl shadow-sm space-y-3">
                  <p className="text-sm sm:text-base md:text-lg font-bold text-sky-900 text-center">
                    ความพึงพอใจในการรับบริการครั้งนี้
                  </p>
                  
                  <div className="grid grid-cols-5 gap-2 sm:gap-3 items-center">
                    {emotionLevels5.map((item) => {
                      const isSelected = counterOverallScore === item.score;
                      return (
                        <button
                          type="button"
                          key={item.score}
                          onClick={() => setCounterOverallScore(item.score)}
                          className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 border transform ${
                            isSelected 
                              ? 'bg-sky-200 scale-105 shadow-md border-2 border-sky-600 ring-2 ring-sky-300' 
                              : 'bg-white hover:bg-sky-100/70 opacity-80 hover:opacity-100 border-sky-100 hover:scale-105'
                          }`}
                        >
                          <span className={`${item.sizeClass} mb-1 drop-shadow-xs`}>
                            {item.emoji}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-bold text-center truncate w-full ${
                            isSelected ? 'text-sky-950 font-extrabold' : 'text-sky-800'
                          }`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 📌 กรณีเลือก "อื่นๆ": แสดงหัวข้อประเมินปกติ พร้อมไอคอน 5 ระดับไล่ขนาดเล็กไปใหญ่ */
                visibleCriteriaList.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">ไม่มีหัวข้อการประเมินในขณะนี้</p>
                ) : (
                  visibleCriteriaList.map((crit, index) => (
                    <div key={crit.id} className="bg-sky-50/70 border border-sky-100 p-2.5 sm:p-3 rounded-2xl shadow-2xs">
                      <p className="font-bold text-sky-900 mb-2 text-center text-xs sm:text-sm md:text-base">
                        {index + 1}. {crit.title}
                      </p>
                      
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
                        {emotionLevels5.map((item) => {
                          const isSelected = scores[crit.id] === item.score;
                          return (
                            <button
                              type="button"
                              key={item.score}
                              onClick={() => setScores({ ...scores, [crit.id]: item.score })}
                              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl cursor-pointer transition-all duration-200 border transform ${
                                isSelected 
                                  ? 'bg-sky-200 scale-105 shadow-md border-2 border-sky-600 ring-2 ring-sky-300' 
                                  : 'bg-white hover:bg-sky-100/70 opacity-75 hover:opacity-100 border-sky-100 hover:scale-105'
                              }`}
                            >
                              <span className={`${item.sizeClass} mb-1 drop-shadow-xs`}>
                                {item.emoji}
                              </span>
                              <span className={`text-[9px] sm:text-[11px] font-bold text-center truncate w-full ${
                                isSelected ? 'text-sky-950 font-extrabold' : 'text-sky-800'
                              }`}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )
              )}

              <div>
                <input 
                  type="text"
                  placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-sky-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm text-sky-900 placeholder-sky-300"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-sky-600 text-white py-3 sm:py-4 rounded-2xl font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-200 text-base sm:text-lg flex-shrink-0"
            >
              ยืนยันการประเมิน
            </button>
          </form>
        </div>
      )}

      {/* 🎉 5. หน้าจอขอบคุณ */}
      {step === 'success' && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center space-y-4">
          <div className="text-6xl sm:text-7xl animate-bounce">💧</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-900">ขอบคุณสำหรับการประเมินครับ!</h2>
          <p className="text-sm sm:text-base text-sky-600/70">ระบบกำลังพากลับสู่หน้าประเมิน...</p>
        </div>
      )}

    </div>
  );
}
