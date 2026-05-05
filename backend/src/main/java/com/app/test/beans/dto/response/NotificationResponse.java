package com.app.test.beans.dto.response;

import lombok.Data;

import java.util.Date;

@Data
public class NotificationResponse {

    private String id;
    private String recipientUserName;
    private String actorUserName;
    private String tripId;
    private String tripName;
    private String type;
    private String message;
    private Boolean readFlag;
    private Date createdDate;
}
