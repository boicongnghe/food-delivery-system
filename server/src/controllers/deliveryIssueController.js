import asyncHandler from '../utils/asyncHandler.js';
import * as deliveryIssueService from '../services/deliveryIssueService.js';

// ----- Shipper (UC34) -----

export const createDeliveryIssue = asyncHandler(async (req, res) => {
  const issue = await deliveryIssueService.createDeliveryIssue(req.user._id, req.params.id, req.body);

  res.status(201).json({
    success: true,
    data: issue,
    message: `Đã gửi báo cáo sự cố ${issue.code}`,
  });
});

// ----- Admin (UC45) -----

export const listDeliveryIssues = asyncHandler(async (req, res) => {
  const result = await deliveryIssueService.listDeliveryIssues(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách báo cáo sự cố thành công',
  });
});

export const getDeliveryIssueDetail = asyncHandler(async (req, res) => {
  const issue = await deliveryIssueService.getDeliveryIssueDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: issue,
    message: 'Lấy chi tiết báo cáo sự cố thành công',
  });
});

export const resolveDeliveryIssue = asyncHandler(async (req, res) => {
  const issue = await deliveryIssueService.resolveDeliveryIssue(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: issue,
    message:
      issue.status === 'resolved' ? `Đã xử lý báo cáo sự cố ${issue.code}` : `Đã bác bỏ báo cáo sự cố ${issue.code}`,
  });
});
