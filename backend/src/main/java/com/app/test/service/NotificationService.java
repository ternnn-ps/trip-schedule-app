package com.app.test.service;

import com.app.test.beans.dto.response.NotificationResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;

import java.util.List;

public interface NotificationService {

    ResponseModelDto<List<NotificationResponse>> list(String userName);

    ResponseModelDto<NotificationResponse> markRead(String id);

    ResponseModelDto<List<NotificationResponse>> markAllRead(String userName);

    void create(String recipientUserName, String actorUserName, String tripId, String tripName, String type, String message);
}
