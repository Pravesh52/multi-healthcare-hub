import PDFDocument from 'pdfkit';

const fmtDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export const buildPrescriptionData = async (rx) => {
  await rx.populate([
    { path: 'patient', select: 'name age gender' },
    {
      path: 'doctor',
      select: 'speciality qualification medRegNo user',
      populate: { path: 'user', select: 'name' },
    },
    {
      path: 'appointment',
      select: 'date slot tokenNo clinic',
      populate: { path: 'clinic', select: 'name address phone' },
    },
  ]);

  return {
    id: rx._id,
    createdAt: rx.createdAt,
    updatedAt: rx.updatedAt,
    diagnosis: rx.diagnosis,
    medicines: rx.medicines,
    advice: rx.advice,
    followUpDate: rx.followUpDate,
    patient: { name: rx.patient.name, age: rx.patient.age, gender: rx.patient.gender },
    doctor: {
      name: rx.doctor.user.name,
      speciality: rx.doctor.speciality,
      qualification: rx.doctor.qualification,
      medRegNo: rx.doctor.medRegNo,
    },
    appointment: {
      id: rx.appointment._id,
      date: rx.appointment.date,
      slot: rx.appointment.slot,
      tokenNo: rx.appointment.tokenNo,
    },
    clinic: {
      name: rx.appointment.clinic.name,
      address: rx.appointment.clinic.address,
      phone: rx.appointment.clinic.phone,
    },
  };
};

export const renderPrescriptionPdf = (d) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 28 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const inner = W - 56;

    // Clinic header
    doc.rect(0, 0, W, 62).fill('#0B7285');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(d.clinic.name, 28, 14, { width: inner });
    doc.font('Helvetica').fontSize(9).text(`${d.clinic.address} | Phone: ${d.clinic.phone}`, 28, 36, { width: inner });

    // Doctor
    doc.fillColor('#12303A').font('Helvetica-Bold').fontSize(12).text(d.doctor.name, 28, 74, { width: inner });
    doc.font('Helvetica').fontSize(9).fillColor('#566F78').text(
      `${d.doctor.qualification} | ${d.doctor.speciality} | Reg. No: ${d.doctor.medRegNo}`,
      28,
      doc.y + 1,
      { width: inner }
    );

    // Patient line
    const patientLine = [
      d.patient.name,
      d.patient.age ? `${d.patient.age} yrs` : null,
      d.patient.gender ? cap(d.patient.gender) : null,
    ]
      .filter(Boolean)
      .join(', ');
    doc.moveTo(28, doc.y + 8).lineTo(W - 28, doc.y + 8).strokeColor('#D6E5E8').stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A').text(`Patient: ${patientLine}`, 28, doc.y + 14, { width: inner });
    doc.font('Helvetica').fontSize(9).fillColor('#566F78').text(
      `Date: ${fmtDate(d.appointment.date)}    Token: ${d.appointment.tokenNo ?? '-'}`,
      28,
      doc.y + 2,
      { width: inner }
    );

    // Diagnosis
    if (d.diagnosis) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A').text('Diagnosis', 28, doc.y + 14);
      doc.font('Helvetica').fontSize(10).fillColor('#12303A').text(d.diagnosis, 28, doc.y + 2, { width: inner });
    }

    // Medicines
    if (d.medicines.length) {
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B7285').text('Rx', 28, doc.y + 12);
      d.medicines.forEach((m, i) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A').text(`${i + 1}. ${m.name}`, 28, doc.y + 4, { width: inner });
        const meta = [m.dosage, m.duration].filter(Boolean).join('   |   ');
        if (meta) doc.font('Helvetica').fontSize(9).fillColor('#566F78').text(meta, 42, doc.y, { width: inner - 14 });
        if (m.notes) doc.font('Helvetica').fontSize(9).fillColor('#566F78').text(m.notes, 42, doc.y, { width: inner - 14 });
      });
    }

    // Advice and follow-up
    if (d.advice) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A').text('Advice', 28, doc.y + 14);
      doc.font('Helvetica').fontSize(10).fillColor('#12303A').text(d.advice, 28, doc.y + 2, { width: inner });
    }
    if (d.followUpDate) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A').text(`Follow-up on: ${fmtDate(d.followUpDate)}`, 28, doc.y + 12);
    }

    doc.font('Helvetica').fontSize(8).fillColor('#8A9BA0').text(
      'This is a computer generated prescription. Take medicines only as advised by your doctor.',
      28,
      doc.y + 22,
      { width: inner, align: 'center' }
    );

    doc.end();
  });