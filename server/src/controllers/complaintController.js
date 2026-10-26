import asyncHandler from '../utils/asyncHandler.js';
import * as complaintService from '../services/complaintService.js';

// ----- Customer (UC18) -----

export const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.createComplaint(req.user._id, req.params.id, req.body);

  res.status(201).json({
    success: true,
    data: complaint,
    message: `Đã gửi khiếu nại ${complaint.code}, chúng tôi sẽ phản hồi sớm nhất`,
  });
});

export const listMyComplaints = asyncHandler(async (req, res) => {
  const result = await complaintService.listMyComplaints(req.user._id, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách khiếu nại thành công',
  });
});

export const listComplainableOrders = asyncHandler(async (req, res) => {
  const result = await complaintService.listComplainableOrders(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn có thể khiếu nại thành công',
  });
});

// ----- Admin (UC42) -----

export const listComplaints = asyncHandler(async (req, res) => {
  const result = await complaintService.listComplaints(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách khiếu nại thành công',
  });
});

export const getComplaintDetail = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: complaint,
    message: 'Lấy chi tiết khiếu nại thành công',
  });
});

export const resolveComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.resolveComplaint(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: complaint,
    message:
      complaint.status === 'resolved'
        ? `Đã giải quyết khiếu nại ${complaint.code}`
        : `Đã từ chối khiếu nại ${complaint.code}`,
  });
});
