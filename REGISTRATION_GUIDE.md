# دليل نظام التسجيل والمستخدمين

## تحديث نظام التسجيل - رقم الهوية الوطنية

تم تحديث نظام التسجيل ليتطلب رقم الهوية الوطنية كحقل إجباري جديد.

## الحقول المطلوبة للتسجيل

### 1. الحقول الأساسية
- **الاسم الكامل** (`fullName`) - مطلوب
- **البريد الإلكتروني** (`email`) - مطلوب ومميز
- **اسم المستخدم** (`username`) - مطلوب ومميز (3 أحرف على الأقل)
- **رقم الهوية الوطنية** (`nationalId`) - **جديد** - مطلوب ومميز (10-15 رقم)
- **كلمة المرور** (`password`) - مطلوب (6 أحرف على الأقل)
- **تأكيد كلمة المرور** (`confirmPassword`) - مطلوب

### 2. الحقول التلقائية
- **الدور** (`role`) - يُحدد تلقائياً كـ "user" للتسجيل العام
- **حالة النشاط** (`isActive`) - يُحدد تلقائياً كـ true
- **تاريخ الإنشاء** (`createdAt`) - يُحدد تلقائياً
- **تاريخ التحديث** (`updatedAt`) - يُحدد تلقائياً

## قواعد التحقق من رقم الهوية

### Frontend (React)
```javascript
// التحقق من رقم الهوية في الفرونت إند
if (!formData.nationalId.trim()) {
  newErrors.nationalId = "رقم الهوية مطلوب";
} else if (!/^[0-9]{10,15}$/.test(formData.nationalId.trim())) {
  newErrors.nationalId = "رقم الهوية يجب أن يكون من 10 إلى 15 رقماً";
}
```

### Backend (Node.js/MongoDB)
```javascript
nationalId: {
  type: String,
  required: [true, 'Please provide national ID'],
  unique: true,
  trim: true,
  minlength: [10, 'National ID must be at least 10 characters'],
  maxlength: [15, 'National ID cannot exceed 15 characters']
}
```

## API التسجيل المحدث

### Endpoint
```
POST /api/auth/register
```

### Request Body
```json
{
  "fullName": "محمد أحمد السعد",
  "email": "mohammed@example.com",
  "username": "mohammed123",
  "nationalId": "1234567890123",
  "password": "securePassword123",
  "role": "user"
}
```

### Response Success (201)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6789abc123",
      "username": "mohammed123",
      "fullName": "محمد أحمد السعد",
      "email": "mohammed@example.com",
      "nationalId": "1234567890123",
      "role": "user"
    }
  }
}
```

## معالجة الأخطاء

### أخطاء التحقق
- **رقم هوية مكرر**: `"National ID already exists"`
- **بريد مكرر**: `"Email already exists"`
- **اسم مستخدم مكرر**: `"Username already exists"`
- **رقم هوية غير صحيح**: `"رقم الهوية يجب أن يكون من 10 إلى 15 رقماً"`

### Response Error (400)
```json
{
  "success": false,
  "error": "National ID already exists"
}
```

## إنشاء حساب المدير

لإنشاء حساب المدير الافتراضي:

```bash
cd backend
node create-admin.js
```

**بيانات المدير الافتراضية:**
- Username: `admin`
- Password: `admin123`
- Full Name: `مدير النظام`
- Email: `admin@investors.com`
- National ID: `1000000001`
- Role: `admin`

## التحديثات على قاعدة البيانات

عند تشغيل النظام لأول مرة بعد التحديث، تأكد من:

1. **حذف البيانات القديمة** (إذا لزم الأمر):
```bash
# الاتصال بـ MongoDB
mongosh investors-system
db.users.drop()
```

2. **إنشاء حساب المدير الجديد**:
```bash
node create-admin.js
```

## ملاحظات مهمة

1. **رقم الهوية مطلوب**: جميع المستخدمين الجدد يجب أن يقدموا رقم هوية صالح
2. **التميز**: رقم الهوية يجب أن يكون مميز في النظام
3. **التنسيق**: يُقبل فقط الأرقام (10-15 رقم)
4. **الأمان**: رقم الهوية محمي ومشفر في قاعدة البيانات
5. **التوافق**: النظام متوافق مع أرقام الهوية السعودية والخليجية

## اختبار النظام

### 1. اختبار التسجيل الصحيح
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "أحمد محمد علي",
    "email": "ahmed@test.com",
    "username": "ahmed123",
    "nationalId": "1234567890",
    "password": "password123"
  }'
```

### 2. اختبار رقم الهوية المكرر
```bash
# تشغيل نفس الطلب مرة أخرى يجب أن يعطي خطأ
```

### 3. اختبار رقم الهوية غير صحيح
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "محمد أحمد",
    "email": "mohammed@test.com",
    "username": "mohammed123",
    "nationalId": "123",
    "password": "password123"
  }'
```

## الدعم والمساعدة

في حالة مواجهة أي مشاكل:

1. تأكد من تشغيل MongoDB
2. تأكد من متغيرات البيئة
3. راجع سجلات الخادم
4. تأكد من صحة تنسيق رقم الهوية

---
**آخر تحديث**: تم إضافة دعم رقم الهوية الوطنية كحقل إجباري للتسجيل 