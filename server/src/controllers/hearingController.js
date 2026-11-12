import asyncHandler from '../utils/asyncHandler.js';
import * as complaintService from '../services/complaintService.js';
import * as deliveryIssueService from '../services/deliveryIssueService.js';
import * as hearingService from '../services/hearingService.js';

// Hearing of a delivery issue (UC45) or a complaint (UC42). The route sets req.caseType ('delivery_issue' | 'complaint').

// Admin detail returned after opening / closing, same shape as GET /api/admin/<cases>/:id
const getAdminDetail = (caseType, caseId) =>
  caseType === 'complaint' ? complaintService.getComplaintDetail(caseId) : deliveryIssueService.getDeliveryIssueDetail(caseId);

// ----- Admin -----

export const openHearing = asyncHandler(async (req, res) => {
  await hearingService.openHearing(req.user._id, req.caseType, req.params.id, req.body);
  const data = await getAdminDetail(req.caseType, req.params.id);

  res.status(200).json({
    success: true,
    data,
    message: `Đã mở phiên đối chất ${req.body.deadlineHours} giờ và mời các bên của đơn hàng`,
  });
});

export const closeHearing = asyncHandler(async (req, res) => {
  await hearingService.closeHearing(req.user._id, req.caseType, req.params.id);
  const data = await getAdminDetail(req.caseType, req.params.id);

  res.status(200).json({ success: true, data, message: 'Đã kết thúc phiên đối chất' });
});

// ----- Parties (shipper, customer, restaurant owner) -----

export const listMyHearings = asyncHandler(async (req, res) => {
  const result = await hearingService.listMyHearings(req.user, req.query);

  res.status(200).json({ success: true, data: result, message: 'Lấy danh sách phiên đối chất thành công' });
});

export const getHearing = asyncHandler(async (req, res) => {
  const hearing = await hearingService.getHearingForParty(req.user, req.caseType, req.params.id);

  res.status(200).json({ success: true, data: hearing, message: 'Lấy phiên đối chất thành công' });
});

// ----- Messages (parties and admins) -----

export const listMessages = asyncHandler(async (req, res) => {
  const messages = await hearingService.listHearingMessages(req.user, req.caseType, req.params.id);

  res.status(200).json({ success: true, data: messages, message: 'Lấy tin nhắn đối chất thành công' });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await hearingService.sendHearingMessage(req.user, req.caseType, req.params.id, req.body.message);

  res.status(201).json({ success: true, data: message, message: 'Đã gửi tin nhắn' });
});
