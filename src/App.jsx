import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function StaffEvaluationApp() {
  const [step, setStep] = useState('login'); // 'login' | 'evaluating' | 'success' | 'admin-login' | 'admin-dashboard'
  const [activeAdminTab, setActiveAdminTab] = useState('reports'); // 'reports' | 'employees' | 'criteria'
  
  // พนักงาน & ล็อกอิน
  const [inputEmpId, setInputEmpId] = useState('');
  const [currentStaff, setCurrentStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  
  // ผลประเมิน
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Admin States
  const [adminPin, setAdminPin] = useState('');
  const [evaluationsList, setEvaluationsList] = useState([]);

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
      setEvaluationsList(list);
    } catch (err) {
      console.error("Error fetching evaluations:", err);
    }
  };

  // ฟังก์ชันสั่งเบราว์เซอร์ให้แสดงผลแบบ Full Screen อัตโนมัติ
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
    try {
      await addDoc(collection(db, "evaluations"), {
        employeeId: currentStaff.employeeId,
        employeeName: currentStaff.name,
        scores,
        comment,
        createdAt: new Date().toISOString()
      });
      setStep('success');
      setTimeout(() => {
        setStep('evaluating');
        setScores({});
        setComment('');
      }, 2000);
    } catch (error) {
      console.error("Error submitting score: ", error);
    }
  };

  // 3. เข้าสู่ระบบ Admin (PIN: 1234)
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

  const calculateReportStats = () => {
    const totalEvals = filteredData.length;
    
    const criteriaStats = {};
    criteriaList.forEach(crit => {
      criteriaStats[crit.id] = {
        title: crit.title,
        scoresCount: { 1: 0, 2: 0, 3: 0, 4: 0 },
        totalScoreSum: 0,
        ratedCount: 0
      };
    });

    const staffScoreMap = {};

    filteredData.forEach(item => {
      const empId = item.employeeId;
      if (!staffScoreMap[empId]) {
        staffScoreMap[empId] = { name: item.employeeName, totalScore: 0, count: 0, score1Count: 0, score4Count: 0 };
      }

      if (item.scores) {
        Object.entries(item.scores).forEach(([critId, score]) => {
          if (criteriaStats[critId]) {
            if (score >= 1 && score <= 4) {
              criteriaStats[critId].scoresCount[score] += 1;
              criteriaStats[critId].totalScoreSum += score;
              criteriaStats[critId].ratedCount += 1;
            }
          }
          staffScoreMap[empId].totalScore += score;
          staffScoreMap[empId].count += 1;
          if (score === 1) staffScoreMap[empId].score1Count += 1;
          if (score === 4) staffScoreMap[empId].score4Count += 1;
        });
      }
    });

    let topStaff = null;
    let lowestStaff = null;
    let maxAvg = -1;
    let maxUnsatisfied = -1;

    Object.entries(staffScoreMap).forEach(([empId, data]) => {
      const avg = data.count > 0 ? data.totalScore / data.count : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        topStaff = { ...data, empId, avg };
      }
      if (data.score1Count > maxUnsatisfied) {
        maxUnsatisfied = data.score1Count;
        lowestStaff = { ...data, empId, unsatisfiedCount: data.score1Count };
      }
    });

    return { totalEvals, criteriaStats, topStaff, lowestStaff };
  };

  const reportStats = calculateReportStats();

  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "วันที่-เวลา,รหัสพนักงาน,ชื่อพนักงาน,ข้อเสนอแนะ,คะแนนรวม\n";

    filteredData.forEach(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-';
      const totalScore = item.scores ? Object.values(item.scores).reduce((a, b) => a + b, 0) : 0;
      const cleanComment = (item.comment || '').replace(/"/g, '""');
      csvContent += `"${dateStr}","${item.employeeId}","${item.employeeName}","${cleanComment}",${totalScore}\n`;
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

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    let criteriaSummaryHTML = '';
    Object.values(reportStats.criteriaStats).forEach((stat, idx) => {
      const rated = stat.ratedCount || 1;
      const p1 = ((stat.scoresCount[1] / rated) * 100).toFixed(1);
      const p2 = ((stat.scoresCount[2] / rated) * 100).toFixed(1);
      const p3 = ((stat.scoresCount[3] / rated) * 100).toFixed(1);
      const p4 = ((stat.scoresCount[4] / rated) * 100).toFixed(1);
      const avg = (stat.totalScoreSum / rated).toFixed(2);

      criteriaSummaryHTML += `
        <div style="margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
          <b>${idx + 1}. ${stat.title}</b> (คะแนนเฉลี่ย: ${avg} / 4.00)<br/>
          <span style="color: #dc2626;">😡 ไม่พอใจเลย: ${stat.scoresCount[1]} คน (${p1}%)</span> | 
          <span style="color: #d97706;">😐 พอใจปานกลาง: ${stat.scoresCount[2]} คน (${p2}%)</span> | 
          <span style="color: #2563eb;">😊 พอใจมาก: ${stat.scoresCount[3]} คน (${p3}%)</span> | 
          <span style="color: #16a34a;">😍 พอใจมากที่สุด: ${stat.scoresCount[4]} คน (${p4}%)</span>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>รายงานสรุปผลการประเมิน - การประปาส่วนภูมิภาคสาขานครพนม</title>
          <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 5px; color: #0369a1; }
            h2 { font-size: 16px; margin-top: 20px; color: #0284c7; }
            p { font-size: 12px; color: #64748b; margin-bottom: 15px; }
            .card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>💧 รายงานสรุปผลการประเมินความพึงพอใจ (การประปาส่วนภูมิภาคสาขานครพนม)</h1>
          <p>ช่วงเวลา: <b>${reportPeriod.toUpperCase()}</b> | พนักงาน: <b>${staffName}</b> | ผู้ประเมินทั้งหมด: <b>${reportStats.totalEvals} ครั้ง</b></p>
          
          <h2>📊 สรุปผลคะแนนแต่ละหัวข้อ</h2>
          ${criteriaSummaryHTML || '<p>ยังไม่มีข้อมูลหัวข้อประเมิน</p>'}

          <h2>🏆 สรุปพนักงานดีเด่น & จุดที่ต้องปรับปรุง</h2>
          <div class="card">
            ⭐ <b>พนักงานที่ได้รับความพึงพอใจสูงสุด:</b> ${reportStats.topStaff ? `${reportStats.topStaff.name} (รหัส: ${reportStats.topStaff.empId}) - คะแนนเฉลี่ย ${reportStats.topStaff.avg.toFixed(2)}/4.0` : 'ไม่มีข้อมูล'}
          </div>
          <div class="card" style="background: #fef2f2; border-color: #fecaca;">
            ⚠️ <b>พนักงานที่ถูกประเมินว่าไม่พอใจเลยมากที่สุด:</b> ${reportStats.lowestStaff && reportStats.lowestStaff.unsatisfiedCount > 0 ? `${reportStats.lowestStaff.name} (รหัส: ${reportStats.lowestStaff.empId}) - จำนวน ${reportStats.lowestStaff.unsatisfiedCount} ครั้ง` : 'ไม่มีข้อมูล'}
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const emotionLevels = [
    { score: 1, emoji: '😡', label: 'ไม่พอใจเลย', sizeClass: 'text-2xl sm:text-3xl md:text-4xl' },
    { score: 2, emoji: '😐', label: 'พอใจปานกลาง', sizeClass: 'text-3xl sm:text-4xl md:text-5xl' },
    { score: 3, emoji: '😊', label: 'พอใจมาก', sizeClass: 'text-4xl sm:text-5xl md:text-6xl' },
    { score: 4, emoji: '😍', label: 'พอใจมากที่สุด', sizeClass: 'text-5xl sm:text-6xl md:text-7xl' }
  ];

  const visibleCriteriaList = criteriaList.filter(crit => crit.active !== false);

  return (
    <div className="h-screen w-screen bg-sky-50 flex items-center justify-center p-0 m-0 overflow-hidden font-sans">
      
      {/* 🔐 1. หน้าจอ Login พนักงาน */}
      {step === 'login' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-sky-100 max-w-md w-full text-center relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-sky-500 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl sm:text-4xl mb-4 shadow-md shadow-sky-200">
            💧
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-900 mb-2">ระบบประเมินความพึงพอใจ</h2>
          <p className="text-sm sm:text-base text-sky-600/70 mb-6">กรุณากรอกรหัสพนักงานเพื่อเริ่มรับการประเมิน</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="กรอกรหัสพนักงาน (เช่น 1234)" 
              value={inputEmpId}
              onChange={(e) => setInputEmpId(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-sky-200 bg-sky-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-lg sm:text-xl font-semibold tracking-wider text-sky-900 placeholder-sky-300"
              required
            />
            {errorMsg && <p className="text-red-500 text-xs sm:text-sm font-medium">{errorMsg}</p>}
            <button 
              type="submit"
              className="w-full bg-sky-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-sky-700 transition shadow-lg shadow-sky-200 text-base sm:text-lg"
            >
              เข้าสู่หน้าประเมิน
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-sky-100">
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
              <h2 className="text-xl sm:text-2xl font-bold text-sky-900">แผงควบคุมผู้ดูแลระบบ</h2>
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
                    onChange={(e) => setReportPeriod(e.target.value)}
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
                    onChange={(e) => setSelectedStaffFilter(e.target.value)}
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

              {/* สรุปสถิติคะแนนแต่ละหัวข้อ */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 border-b border-sky-100 pb-2">📊 สรุปผลการประเมินแยกตามหัวข้อ (คะแนนและเปอร์เซ็นต์)</h3>
                
                {Object.keys(reportStats.criteriaStats).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลหัวข้อการประเมิน</p>
                ) : (
                  <div className="space-y-4">
                    {Object.values(reportStats.criteriaStats).map((stat, idx) => {
                      const rated = stat.ratedCount || 1;
                      const p1 = ((stat.scoresCount[1] / rated) * 100).toFixed(1);
                      const p2 = ((stat.scoresCount[2] / rated) * 100).toFixed(1);
                      const p3 = ((stat.scoresCount[3] / rated) * 100).toFixed(1);
                      const p4 = ((stat.scoresCount[4] / rated) * 100).toFixed(1);
                      const avg = (stat.totalScoreSum / rated).toFixed(2);

                      return (
                        <div key={idx} className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-100 space-y-2">
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="font-bold text-sky-900">{idx + 1}. {stat.title}</span>
                            <span className="bg-sky-200 text-sky-800 px-2 py-0.5 rounded-md font-bold">คะแนนเฉลี่ย: {avg} / 4.00</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] sm:text-xs">
                            <div className="bg-white p-2 rounded-lg border border-red-100 text-red-700">
                              😡 ไม่พอใจเลย: <b>{stat.scoresCount[1]} คน</b> ({p1}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-100 text-amber-700">
                              😐 พอใจปานกลาง: <b>{stat.scoresCount[2]} คน</b> ({p2}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-blue-100 text-blue-700">
                              😊 พอใจมาก: <b>{stat.scoresCount[3]} คน</b> ({p3}%)
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-emerald-100 text-emerald-700">
                              😍 พอใจมากที่สุด: <b>{stat.scoresCount[4]} คน</b> ({p4}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* สรุปพนักงานสูงสุดและต่ำสุด */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900 mb-1">⭐ พนักงานที่ได้รับความพอใจสูงสุด (ดีเยี่ยม)</h4>
                  {reportStats.topStaff ? (
                    <div className="text-xs sm:text-sm text-emerald-800 space-y-1">
                      <p><b>ชื่อ:</b> {reportStats.topStaff.name} (รหัส: {reportStats.topStaff.empId})</p>
                      <p><b>คะแนนเฉลี่ยรวม:</b> {reportStats.topStaff.avg.toFixed(2)} / 4.00 คะแนน</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีข้อมูลการประเมิน</p>
                  )}
                </div>

                <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200">
                  <h4 className="text-xs sm:text-sm font-bold text-red-900 mb-1">⚠️ พนักงานที่ถูกประเมินไม่พอใจเลยมากที่สุด</h4>
                  {reportStats.lowestStaff && reportStats.lowestStaff.unsatisfiedCount > 0 ? (
                    <div className="text-xs sm:text-sm text-red-800 space-y-1">
                      <p><b>ชื่อ:</b> {reportStats.lowestStaff.name} (รหัส: {reportStats.lowestStaff.empId})</p>
                      <p><b>จำนวนครั้งที่ไม่พอใจ:</b> {reportStats.lowestStaff.unsatisfiedCount} ครั้ง</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">ยอดเยี่ยม! ไม่มีรายการไม่พอใจเลยในช่วงเวลานี้</p>
                  )}
                </div>
              </div>

              {/* ตารางแสดงรายละเอียดประวัติ */}
              <div className="overflow-x-auto">
                <h3 className="text-xs sm:text-sm font-bold text-sky-900 mb-2">📋 ประวัติการประเมินย้อนหลัง</h3>
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-sky-100/70 text-sky-900 border-b border-sky-200">
                      <th className="p-3 rounded-tl-xl">วันที่-เวลา</th>
                      <th className="p-3">รหัส</th>
                      <th className="p-3">ชื่อพนักงาน</th>
                      <th className="p-3">ข้อเสนอแนะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center p-8 text-sky-400">ไม่พบข้อมูลการประเมินตามเงื่อนไขที่เลือก</td>
                      </tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-sky-50/50">
                          <td className="p-3 text-sky-900">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '-'}
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
          
          {/* ปุ่มออกจากระบบลอยมุมขวาบน */}
          <button
            type="button"
            onClick={() => {
              if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              setStep('login');
              setInputEmpId('');
              setCurrentStaff(null);
              setScores({});
              setComment('');
            }}
            className="absolute top-3 right-3 text-xs text-sky-600 hover:text-red-500 border border-sky-200 bg-sky-50 px-3 py-1.5 rounded-xl transition font-semibold z-20"
          >
            ออกจากระบบ
          </button>

          {/* Header รูปพนักงาน + ชื่อและตำแหน่ง (นำหยดน้ำออกจากรูปโปรไฟล์แล้ว) */}
          <div className="flex flex-col items-center justify-center border-b border-sky-100 pb-2 mb-2 flex-shrink-0 text-center">
            <div className="mb-2">
              <img 
                src={currentStaff.photoUrl} 
                alt={currentStaff.name} 
                className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full object-cover shadow-xl border-4 border-sky-300 p-1 bg-white mx-auto"
              />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-900 leading-tight">{currentStaff.name}</h2>
            <p className="text-xs sm:text-sm md:text-base text-sky-600 font-semibold">{currentStaff.position}</p>
          </div>

          {/* Form หัวข้อประเมิน */}
          <form onSubmit={handleSubmitScore} className="flex flex-col justify-between flex-1 space-y-2 overflow-hidden">
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 flex flex-col justify-around">
              
              {/* ข้อความเพิ่มเติมพร้อมไอคอนหยดน้ำ 💧 หน้า-หลัง */}
              <div className="text-center py-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-sky-800 bg-sky-100/70 py-2 px-4 rounded-2xl shadow-2xs inline-block">
                  💧 โปรดประเมินความพึงพอใจในการรับบริการครั้งนี้ 💧
                </h3>
              </div>

              {visibleCriteriaList.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">ไม่มีหัวข้อการประเมินในขณะนี้</p>
              ) : (
                visibleCriteriaList.map((crit, index) => (
                  <div key={crit.id} className="bg-sky-50/70 border border-sky-100 p-2 sm:p-3 rounded-2xl shadow-2xs">
                    <p className="font-bold text-sky-900 mb-1.5 text-center text-sm sm:text-base md:text-lg">
                      {index + 1}. {crit.title}
                    </p>
                    
                    {/* ปุ่มไอคอนประเมิน */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      {emotionLevels.map((item) => {
                        const isSelected = scores[crit.id] === item.score;
                        return (
                          <button
                            type="button"
                            key={item.score}
                            onClick={() => setScores({ ...scores, [crit.id]: item.score })}
                            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl cursor-pointer transition-all duration-200 transform ${
                              isSelected 
                                ? 'bg-sky-200 scale-105 shadow-md border-2 border-sky-500 ring-2 ring-sky-300' 
                                : 'bg-white hover:bg-sky-100/70 opacity-70 hover:opacity-100 border border-sky-100 hover:scale-105'
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
                ))
              )}

              {/* ข้อเสนอแนะเพิ่มเติมแบบย่อ */}
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

            {/* ปุ่มยืนยัน */}
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
