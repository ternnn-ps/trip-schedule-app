package com.app.test.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.util.Date;

@Setter
@Getter
@Entity
@Table(name = "MS_NOTIFICATION")
public class MsNotification {

    @Id
    private String id;

    private String recipientUserName;
    private String actorUserName;
    private String tripId;
    private String tripName;
    private String type;
    private String message;
    private Boolean readFlag = false;
    private Date createdDate;
    private Character recordStatus;
}
