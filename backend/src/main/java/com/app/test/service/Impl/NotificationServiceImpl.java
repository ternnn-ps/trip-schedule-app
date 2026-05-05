package com.app.test.service.Impl;

import com.app.test.beans.dto.response.NotificationResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsNotification;
import com.app.test.repository.MsNotificationRepository;
import com.app.test.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private MsNotificationRepository msNotificationRepository;

    @Override
    public ResponseModelDto<List<NotificationResponse>> list(String userName) {
        try {
            if (!hasText(userName)) {
                return new ResponseModelDto<>("Failed", "User name is required", null, false);
            }

            List<NotificationResponse> notifications = msNotificationRepository
                    .findTop50ByRecipientUserNameIgnoreCaseAndRecordStatusOrderByCreatedDateDesc(userName.trim(), 'A')
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());

            return new ResponseModelDto<>("Success", notifications, true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<NotificationResponse> markRead(String id) {
        try {
            MsNotification notification = msNotificationRepository.findById(id).orElse(null);

            if (notification == null || notification.getRecordStatus() != 'A') {
                return new ResponseModelDto<>("Failed", "Notification not found", null, false);
            }

            notification.setReadFlag(true);
            notification = msNotificationRepository.save(notification);

            return new ResponseModelDto<>("Success", mapToResponse(notification), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<List<NotificationResponse>> markAllRead(String userName) {
        try {
            if (!hasText(userName)) {
                return new ResponseModelDto<>("Failed", "User name is required", null, false);
            }

            List<MsNotification> notifications = msNotificationRepository
                    .findByRecipientUserNameIgnoreCaseAndReadFlagAndRecordStatus(userName.trim(), false, 'A');

            notifications.forEach((notification) -> notification.setReadFlag(true));
            msNotificationRepository.saveAll(notifications);

            return list(userName);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public void create(String recipientUserName, String actorUserName, String tripId, String tripName, String type, String message) {
        if (!hasText(recipientUserName)) {
            return;
        }

        MsNotification notification = new MsNotification();
        notification.setId("notification-" + UUID.randomUUID().toString());
        notification.setRecipientUserName(recipientUserName.trim());
        notification.setActorUserName(normalize(actorUserName));
        notification.setTripId(normalize(tripId));
        notification.setTripName(normalize(tripName));
        notification.setType(normalize(type));
        notification.setMessage(normalize(message));
        notification.setReadFlag(false);
        notification.setCreatedDate(new Date());
        notification.setRecordStatus('A');
        msNotificationRepository.save(notification);
    }

    private NotificationResponse mapToResponse(MsNotification entity) {
        NotificationResponse response = new NotificationResponse();
        response.setId(entity.getId());
        response.setRecipientUserName(entity.getRecipientUserName());
        response.setActorUserName(entity.getActorUserName());
        response.setTripId(entity.getTripId());
        response.setTripName(entity.getTripName());
        response.setType(entity.getType());
        response.setMessage(entity.getMessage());
        response.setReadFlag(Boolean.TRUE.equals(entity.getReadFlag()));
        response.setCreatedDate(entity.getCreatedDate());
        return response;
    }

    private String normalize(String value) {
        return hasText(value) ? value.trim() : "";
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
