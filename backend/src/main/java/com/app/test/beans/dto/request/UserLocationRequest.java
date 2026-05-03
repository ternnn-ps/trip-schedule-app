package com.app.test.beans.dto.request;

import lombok.Data;

@Data
public class UserLocationRequest {

    private Long userId;
    private Double latitude;
    private Double longitude;

}
