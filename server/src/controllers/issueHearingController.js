import asyncHandler from '../utils/asyncHandler.js';
import * as deliveryIssueService from '../services/deliveryIssueService.js';
import * as issueHearingService from '../services/issueHearingService.js';

// Hearing of a delivery issue (UC45): admins open / close it, shipper, customer and restaurant owner chat in it

// ----- Admin -----

export const openHearing = asyncHandler(async (req, res) => {
  await issueHearingService.openHearing(req.user._id, req.params.id, req.body);
  const issue = await deliveryIssueService.getDeliveryIssueDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: issue,
    message: `Đã mở phiên đối chất ${req.body.deadlineHours} giờ và mời shipper, khách hàng, nhà hàng`,
  });
});

export const closeHearing = asyncHandler(async (req, res) => {
  await issueHearingService.closeHearing(req.user._id, req.params.id);
  const issue = await deliveryIssueService.getDeliveryIssueDetail(req.params.id);

  res.status(200).json({ success: true, data: issue, message: 'Đã kết thúc phiên đối chất' });
});

// ----- Parties -----

export const listMyHearings = asyncHandler(async (req, res) => {
  const result = await issueHearingService.listMyHearings(req.user, req.query);

  res.status(200).json({ success: true, data: result, message: 'Lấy danh sách phiên đối chất thành công' });
});

export const getHearing = asyncHandler(async (req, res) => {
  const hearing = await issueHearingService.getHearingForParty(req.user, req.params.id);

  res.status(200).json({ success: true, data: hearing, message: 'Lấy phiên đối chất thành công' });
});

// ----- Messages (parties and admins) -----

export const listMessages = asyncHandler(async (req, res) => {
  const messages = await issueHearingService.listHearingMessages(req.user, req.params.id);

  res.status(200).json({ success: true, data: messages, message: 'Lấy tin nhắn đối chất thành công' });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await issueHearingService.sendHearingMessage(req.user, req.params.id, req.body.message);

  res.status(201).json({ success: true, data: message, message: 'Đã gửi tin nhắn' });
});
