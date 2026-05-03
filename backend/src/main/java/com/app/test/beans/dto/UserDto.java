package com.app.test.beans.dto;

import lombok.Data;

import java.util.Date;

@Data
public class UserDto {

    private Long userId;
    private String userName;
    private String userFullName;
    private String email;
    private String phone;
    private String website;
    private Double lastLatitude;
    private Double lastLongitude;
    private Date lastLocationUpdatedAt;

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;

}
