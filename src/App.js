import React, { useState, useEffect } from "react";
import { Send, CheckCircle, AlertCircle, Shield } from "lucide-react";

const RepairForm = () => {
  const [formData, setFormData] = useState({
    employeeId: "",
    department: "",
    location: "",
    customLocation: "",
    lane: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const turnstileContainerRef = React.useRef(null);
  const isLoadingRef = React.useRef(false);

  // Load Turnstile script และ render widget เพียงครั้งเดียว
  useEffect(() => {
    // ถ้ากำลังโหลดอยู่ ไม่ต้องทำอะไร
    if (isLoadingRef.current) return;

    // ถ้า Turnstile โหลดแล้ว ให้ render เลย
    if (window.turnstile) {
      renderTurnstileWidget();
      return;
    }

    // ถ้ายังไม่โหลด ให้โหลด script
    isLoadingRef.current = true;

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("✅ Turnstile script loaded");
      renderTurnstileWidget();
    };

    script.onerror = () => {
      console.error("❌ Failed to load Turnstile script");
      isLoadingRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      if (turnstileWidgetId !== null && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId);
        } catch (e) {
          console.log("Turnstile cleanup:", e);
        }
      }
    };
  }, []);

  // ฟังก์ชัน render Turnstile widget
  const renderTurnstileWidget = () => {
    if (!turnstileContainerRef.current) {
      console.log("⏳ Container not ready");
      return;
    }

    if (turnstileWidgetId !== null) {
      console.log("⚠️ Widget already rendered");
      return;
    }

    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.error("❌ Turnstile Site Key not found in .env");
      return;
    }

    console.log("🔑 Using Site Key:", siteKey.substring(0, 10) + "...");

    try {
      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          console.log("✅ Turnstile verified:", token.substring(0, 20) + "...");
          setTurnstileToken(token);
        },
        "error-callback": () => {
          console.error("❌ Turnstile error");
          setTurnstileToken("");
        },
        "expired-callback": () => {
          console.log("⏰ Turnstile expired");
          setTurnstileToken("");
        },
        theme: "light",
        size: "normal",
      });

      setTurnstileWidgetId(widgetId);
      console.log("🎯 Turnstile widget rendered with ID:", widgetId);
    } catch (error) {
      console.error("❌ Error rendering Turnstile:", error);
    }
  };

  // ข้อมูลแผนกและสถานที่
  const departments = [
    { value: "it", label: "IT" },
    { value: "hr", label: "HR" },
    { value: "production", label: "Production" },
    { value: "maintenance", label: "Maintenance" },
  ];

  const locationsByDept = {
    it: [
      "Server Room",
      "IT Office Floor 1",
      "IT Office Floor 2",
      "Network Center",
      "อื่นๆ",
    ],
    hr: ["HR Office", "Training Room", "Reception", "Meeting Room A", "อื่นๆ"],
    production: [
      "Production Line 1",
      "Production Line 2",
      "Warehouse",
      "Quality Control",
      "อื่นๆ",
    ],
    maintenance: [
      "Workshop",
      "Tool Storage",
      "Maintenance Office",
      "Equipment Room",
      "อื่นๆ",
    ],
  };

  // ด่าน/เลน แยกตามสถานที่
  const lanesByLocation = {
    // IT Department
    "Server Room": ["Lane 1", "Lane 2", "Lane 3", "Lane 4", "Lane 5"],
    "IT Office Floor 1": ["Zone A", "Zone B", "Zone C"],
    "IT Office Floor 2": ["Zone D", "Zone E", "Zone F"],
    "Network Center": ["Network 01", "Network 02", "Network 03", "Network 04"],

    // HR Department
    "HR Office": ["Desk 1-10", "Desk 11-20", "Desk 21-30"],
    "Training Room": ["Room A", "Room B", "Room C"],
    Reception: ["Counter 1", "Counter 2", "Counter 3"],
    "Meeting Room A": ["Table 1", "Table 2", "Table 3"],

    // Production Department
    "Production Line 1": [
      "Station A1",
      "Station A2",
      "Station A3",
      "Station A4",
    ],
    "Production Line 2": [
      "Station B1",
      "Station B2",
      "Station B3",
      "Station B4",
    ],
    Warehouse: ["Section 1", "Section 2", "Section 3", "Section 4"],
    "Quality Control": ["QC-1", "QC-2", "QC-3"],

    // Maintenance Department
    Workshop: ["Bay 1", "Bay 2", "Bay 3", "Bay 4"],
    "Tool Storage": ["Shelf A", "Shelf B", "Shelf C", "Shelf D"],
    "Maintenance Office": ["Area 1", "Area 2", "Area 3"],
    "Equipment Room": ["Rack 1", "Rack 2", "Rack 3", "Rack 4"],
  };

  // ฟังก์ชัน sanitize input เพื่อป้องกัน XSS
  const sanitizeInput = (input) => {
    if (typeof input !== "string") return input;
    return input
      .replace(/[<>]/g, "") // ลบ < และ >
      .replace(/javascript:/gi, "") // ลบ javascript:
      .replace(/on\w+=/gi, "") // ลบ event handlers
      .trim();
  };

  // ฟังก์ชัน validate รหัสพนักงาน
  // จริงๆ ต้องเป็นตัวเลข 5 หลักพอดี แต่ไม่บอก user
  const validateEmployeeId = (id) => {
    // ต้องเป็นตัวเลข 5 หลักพอดี
    return /^\d{5}$/.test(id);
  };

  // ฟังก์ชัน validate ข้อความ
  const validateText = (text, minLength = 1, maxLength = 500) => {
    if (!text || text.trim().length < minLength) return false;
    if (text.length > maxLength) return false;
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setError(""); // Clear error

    // รหัสพนักงาน - อนุญาตให้กรอกอะไรก็ได้ ไม่จำกัด (เพื่อไม่เปิดเผยรูปแบบ)
    if (name === "employeeId") {
      // ไม่กรอง ไม่จำกัด ให้กรอกอะไรก็ได้
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    // Sanitize input สำหรับ text fields
    if (name === "customLocation" || name === "description") {
      const sanitized = sanitizeInput(value);
      // จำกัดความยาว
      const maxLength = name === "description" ? 500 : 100;
      const limited = sanitized.slice(0, maxLength);
      setFormData((prev) => ({ ...prev, [name]: limited }));
      return;
    }

    // รีเซ็ตสถานที่เมื่อเปลี่ยนแผนก
    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        location: "",
        customLocation: "",
        lane: "",
      }));
      return;
    }

    // รีเซ็ต customLocation และ lane เมื่อเลือกสถานที่
    if (name === "location") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        customLocation: "",
        lane: value === "อื่นๆ" ? "" : prev.lane,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    // ตรวจสอบ Turnstile token
    if (!turnstileToken) {
      setError("กรุณายืนยันว่าคุณไม่ใช่บอท");
      return false;
    }

    // ตรวจสอบรหัสพนักงาน - ไม่บอกสาเหตุเพื่อความปลอดภัย
    if (!validateEmployeeId(formData.employeeId)) {
      setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
      return false;
    }

    // ตรวจสอบแผนก
    if (!departments.some((d) => d.value === formData.department)) {
      setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
      return false;
    }

    // ตรวจสอบสถานที่
    if (formData.location === "อื่นๆ") {
      if (!validateText(formData.customLocation, 2, 100)) {
        setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
        return false;
      }
    } else {
      const validLocations = locationsByDept[formData.department] || [];
      if (!validLocations.includes(formData.location)) {
        setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
        return false;
      }
    }

    // ตรวจสอบด่าน/เลน (ถ้าไม่ใช่อื่นๆ)
    if (formData.location !== "อื่นๆ") {
      const validLanes = lanesByLocation[formData.location] || [];
      if (!validLanes.includes(formData.lane)) {
        setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
        return false;
      }
    }

    // ตรวจสอบอาการแจ้งซ่อม
    if (!validateText(formData.description, 10, 500)) {
      setError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Validate ก่อนส่ง
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // สร้าง timestamp
      const timestamp = new Date().toLocaleString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // กำหนดสถานที่สุดท้าย
      const finalLocation =
        formData.location === "อื่นๆ"
          ? sanitizeInput(formData.customLocation)
          : formData.location;

      // เตรียมข้อมูลส่ง
      const dataToSubmit = {
        employeeId: formData.employeeId,
        department:
          departments.find((d) => d.value === formData.department)?.label || "",
        location: finalLocation,
        lane: formData.location === "อื่นๆ" ? "-" : formData.lane,
        description: sanitizeInput(formData.description),
        timestamp: timestamp,
        status: "รับแจ้ง",
        turnstileToken: turnstileToken, // เพิ่ม token
      };

      console.log("ข้อมูลที่จะส่ง:", dataToSubmit);

      // ตรวจสอบว่ามี API URL หรือไม่
      const apiUrl = process.env.REACT_APP_GOOGLE_SCRIPT_URL;

      if (!apiUrl) {
        console.error(
          "⚠️ ยังไม่ได้ตั้งค่า REACT_APP_GOOGLE_SCRIPT_URL ใน .env"
        );
        setError("ระบบยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
        setIsSubmitting(false);
        return;
      }

      // ส่งข้อมูลจริง
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((res) => res.text())
        .then((text) => {
          const json = JSON.parse(text);
          console.log(json);
        });

      // mode: 'no-cors' จะไม่ได้ response กลับมา แต่ถ้าไม่ error แสดงว่าส่งสำเร็จ
      setSubmitSuccess(true);

      // รีเซ็ต Turnstile
      if (window.turnstile) {
        window.turnstile.reset();
      }
      setTurnstileToken("");

      // รีเซ็ตฟอร์มหลัง 3 วินาที
      setTimeout(() => {
        setFormData({
          employeeId: "",
          department: "",
          location: "",
          customLocation: "",
          lane: "",
          description: "",
        });
        setSubmitSuccess(false);
        setError("");
      }, 3000);
    } catch (error) {
      console.error("Error:", error);
      setError("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");

      // รีเซ็ต Turnstile เมื่อเกิด error
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
      setTurnstileToken("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (!formData.employeeId || formData.employeeId.trim() === "") return false;
    if (!formData.department) return false;
    if (formData.location === "อื่นๆ") {
      return (
        formData.customLocation.trim().length >= 2 &&
        formData.description.trim().length >= 10 &&
        turnstileToken !== ""
      );
    }
    if (!formData.location) return false;
    if (!formData.lane) return false;
    if (formData.description.trim().length < 10) return false;
    if (!turnstileToken) return false; // ต้องมี Turnstile token
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Security Badge */}
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">
            <strong>ระบบปลอดภัย:</strong>{" "}
            ข้อมูลของคุณได้รับการเข้ารหัสและตรวจสอบความถูกต้อง
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ระบบแจ้งซ่อม
            </h1>
            <p className="text-gray-600">กรุณากรอกข้อมูลให้ครบถ้วน</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ส่งข้อมูลสำเร็จ!
              </h2>
              <p className="text-gray-600">ระบบได้รับการแจ้งซ่อมของคุณแล้ว</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* รหัสพนักงาน */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  รหัสพนักงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="กรอกรหัสพนักงาน"
                  autoComplete="off"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              {/* แผนก */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  แผนก <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* สถานที่ */}
              {formData.department && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    สถานที่ <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  >
                    <option value="">-- เลือกสถานที่ --</option>
                    {locationsByDept[formData.department]?.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* สถานที่อื่นๆ */}
              {formData.location === "อื่นๆ" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ระบุสถานที่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customLocation"
                    value={formData.customLocation}
                    onChange={handleInputChange}
                    placeholder="กรอกสถานที่"
                    maxLength="100"
                    autoComplete="off"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
              )}

              {/* ด่าน/เลน */}
              {formData.location && formData.location !== "อื่นๆ" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ด่าน/เลน <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="lane"
                    value={formData.lane}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  >
                    <option value="">-- เลือกด่าน/เลน --</option>
                    {(lanesByLocation[formData.location] || []).map((lane) => (
                      <option key={lane} value={lane}>
                        {lane}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* อาการแจ้งซ่อม */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อาการแจ้งซ่อม <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="อธิบายรายละเอียดอาการที่ต้องการแจ้งซ่อม"
                  rows="4"
                  maxLength="500"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  required
                />
              </div>

              {/* Cloudflare Turnstile */}
              <div>
                <div ref={turnstileContainerRef}></div>
                {!turnstileToken && (
                  <p className="mt-2 text-xs text-gray-500">
                    📋 กรุณายืนยันว่าคุณไม่ใช่บอท
                  </p>
                )}
                {turnstileToken && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    ยืนยันสำเร็จ
                  </p>
                )}
              </div>

              {/* ปุ่มส่ง */}
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังส่งข้อมูล...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    ส่งแจ้งซ่อม
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairForm;
